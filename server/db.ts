import { eq, desc, inArray, notInArray, like, or, and, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser, users,
  customerProfiles, InsertCustomerProfile,
  addresses, InsertAddress,
  orders, InsertOrder,
  productReviews, InsertProductReview,
  whatsappSubscribers,
  emailSubscribers,
  blogPosts,
  coupons, InsertCoupon,
  productStock, InsertProductStock,
  otpCodes,
  storeSettings,
  abandonedCarts, InsertAbandonedCart,
  products, InsertProduct,
  pageViews, InsertPageView,
  productImages, InsertProductImage,
  whatsappTemplates, InsertWhatsappTemplate,
  whatsappContacts, InsertWhatsappContact,
  whatsappCampaigns,
  homepageSections, InsertHomepageSection,
  stockAlerts, StockAlert,
  emailLogs, EmailLog,
  emailUnsubscribes,
  adminUsers,
  wishlists,
  referrals,
  loyaltyPoints,
  cartEvents, InsertCartEvent,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Idempotent runtime schema top-up. The drizzle migration journal is frozen at
// 0020 and later migrations (incl. these columns) are applied as plain SQL. To
// avoid a manual step on deploy, we add the additive columns here with
// IF NOT EXISTS (TiDB-supported) — safe to run repeatedly, runs once per process.
let _ensureColumnsPromise: Promise<void> | null = null;
function ensureRuntimeColumns(db: ReturnType<typeof drizzle>): Promise<void> {
  if (!_ensureColumnsPromise) {
    _ensureColumnsPromise = (async () => {
      const stmts = [
        "ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `notes` text",
        "ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `utmSource` varchar(200)",
        "ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `utmMedium` varchar(200)",
        "ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `utmCampaign` varchar(200)",
        "ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `utmContent` varchar(200)",
        "ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `utmTerm` varchar(200)",
        "ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `metafields` json",
        "CREATE INDEX IF NOT EXISTS `whatsappLogs_metaMessageId_idx` ON `whatsappLogs` (`metaMessageId`)",
        "CREATE INDEX IF NOT EXISTS `whatsappLogs_phone_sentAt_idx` ON `whatsappLogs` (`phone`, `sentAt`)",
        "CREATE INDEX IF NOT EXISTS `whatsappLogs_campaignId_status_idx` ON `whatsappLogs` (`campaignId`, `status`)",
        "CREATE INDEX IF NOT EXISTS `emailLogs_campaignId_sentAt_idx` ON `emailLogs` (`campaignId`, `sentAt`)",
        "CREATE INDEX IF NOT EXISTS `stockAlerts_productId_idx` ON `stockAlerts` (`productId`)",
        `CREATE TABLE IF NOT EXISTS \`cartEvents\` (
          \`id\` int AUTO_INCREMENT PRIMARY KEY,
          \`sessionId\` varchar(64) NOT NULL,
          \`customerId\` int,
          \`event\` varchar(30) NOT NULL,
          \`productId\` int,
          \`cartValue\` int NOT NULL DEFAULT 0,
          \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
          INDEX \`cartEvents_sessionId_idx\` (\`sessionId\`),
          INDEX \`cartEvents_event_idx\` (\`event\`),
          INDEX \`cartEvents_createdAt_idx\` (\`createdAt\`)
        )`,
        `CREATE TABLE IF NOT EXISTS \`subscriptions\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`userId\` INT NOT NULL,
          \`productId\` INT NOT NULL,
          \`variantIdx\` INT DEFAULT 0,
          \`quantity\` INT DEFAULT 1,
          \`frequencyDays\` INT NOT NULL,
          \`discountPercent\` INT DEFAULT 10,
          \`status\` ENUM('active','paused','cancelled') DEFAULT 'active',
          \`nextDeliveryDate\` DATE,
          \`lastOrderId\` INT NULL,
          \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`subscriptions_userId_idx\` (\`userId\`),
          INDEX \`subscriptions_status_idx\` (\`status\`)
        )`,
        "ALTER TABLE `productReviews` ADD COLUMN IF NOT EXISTS `orderId` varchar(50)",
        "ALTER TABLE `productReviews` ADD COLUMN IF NOT EXISTS `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'approved'",
        "ALTER TABLE `productReviews` ADD COLUMN IF NOT EXISTS `helpfulCount` int NOT NULL DEFAULT 0",
        "CREATE INDEX IF NOT EXISTS `productReviews_customerId_idx` ON `productReviews` (`customerId`)",
        "CREATE INDEX IF NOT EXISTS `productReviews_status_idx` ON `productReviews` (`status`)",
        // NW-PAY-02 refund support — must exist before any order SELECT (drizzle
        // selects these columns explicitly once they're in the schema).
        "ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `paymentId` varchar(120) DEFAULT NULL",
        "ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `refundedAmount` int NOT NULL DEFAULT 0",
        "ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `refundStatus` enum('none','partial','full','failed') NOT NULL DEFAULT 'none'",
        // Order channel — "app" | "web" (shown in the admin orders list).
        "ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `source` varchar(10) DEFAULT NULL",
        // Abandoned-cart insights: channel, IP-derived location, guest session id.
        "ALTER TABLE `abandonedCarts` ADD COLUMN IF NOT EXISTS `source` varchar(10) DEFAULT NULL",
        "ALTER TABLE `abandonedCarts` ADD COLUMN IF NOT EXISTS `location` varchar(160) DEFAULT NULL",
        "ALTER TABLE `abandonedCarts` ADD COLUMN IF NOT EXISTS `sessionId` varchar(64) DEFAULT NULL",
        // NW-DATA-02 per-customer coupon limit.
        "ALTER TABLE `coupons` ADD COLUMN IF NOT EXISTS `perUserLimit` int NOT NULL DEFAULT 0",
      ];
      for (const s of stmts) {
        try {
          await db.execute(sql.raw(s));
        } catch (e) {
          console.warn("[Database] ensureRuntimeColumns:", s, e);
        }
      }
    })();
  }
  return _ensureColumnsPromise;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      const pool = mysql.createPool({
        host: parsed.hostname,
        port: Number(parsed.port) || 4000,
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.slice(1),
        ssl: { rejectUnauthorized: true },
        connectionLimit: 10,
        enableKeepAlive: true,
        waitForConnections: true,
      });
      _db = drizzle(pool as any);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  if (_db) await ensureRuntimeColumns(_db);
  return _db;
}

// ─── OAuth Users ──────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Customer Profiles (OTP-based) ───────────────────────────────────────────

export async function upsertCustomerByPhone(
  phone: string,
  data?: { name?: string; email?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(customerProfiles).where(eq(customerProfiles.phone, phone)).limit(1);

  if (existing.length > 0) {
    // Update name/email only if provided
    const updateSet: Record<string, unknown> = {};
    if (data?.name) updateSet.name = data.name;
    if (data?.email) updateSet.email = data.email;
    if (Object.keys(updateSet).length > 0) {
      await db.update(customerProfiles).set(updateSet).where(eq(customerProfiles.phone, phone));
    }
    const updated = await db.select().from(customerProfiles).where(eq(customerProfiles.phone, phone)).limit(1);
    return updated[0];
  } else {
    const insert: InsertCustomerProfile = { phone, name: data?.name, email: data?.email };
    await db.insert(customerProfiles).values(insert);
    const created = await db.select().from(customerProfiles).where(eq(customerProfiles.phone, phone)).limit(1);
    return created[0];
  }
}

export async function getCustomerByPhone(phone: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(customerProfiles).where(eq(customerProfiles.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ─── Addresses ───────────────────────────────────────────────────────────────

export async function getAddressesByCustomerId(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(addresses).where(eq(addresses.customerId, customerId)).orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
}

export async function addAddressForCustomer(data: Omit<InsertAddress, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // If this is default, clear other defaults first
  if (data.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.customerId, data.customerId));
  }

  await db.insert(addresses).values(data);
  const result = await db.select().from(addresses)
    .where(eq(addresses.customerId, data.customerId))
    .orderBy(desc(addresses.createdAt))
    .limit(1);
  return result[0];
}

export async function updateAddressById(
  id: number,
  customerId: number,
  data: Partial<Omit<InsertAddress, "id" | "customerId" | "createdAt" | "updatedAt">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.customerId, customerId));
  }

  await db.update(addresses).set(data).where(and(eq(addresses.id, id), eq(addresses.customerId, customerId)));
  const result = await db.select().from(addresses).where(and(eq(addresses.id, id), eq(addresses.customerId, customerId))).limit(1);
  if (!result[0]) throw new Error("Address not found");
  return result[0];
}

export async function deleteAddressById(id: number, customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.customerId, customerId)));
  // Promote most recent remaining address to default if none is default
  const remaining = await db.select().from(addresses).where(eq(addresses.customerId, customerId)).orderBy(desc(addresses.createdAt));
  const hasDefault = remaining.some(a => a.isDefault);
  if (!hasDefault && remaining.length > 0) {
    await db.update(addresses).set({ isDefault: true }).where(eq(addresses.id, remaining[0].id));
  }
  return { success: true };
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function createOrder(data: InsertOrder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(orders).values(data);
  const result = await db.select().from(orders).where(eq(orders.id, data.id)).limit(1);
  return result[0];
}

/** Thrown by createOrderWithStock when an item can't be reserved. Lets callers
 *  show a friendly "out of stock" message vs. a generic DB failure. */
export class OrderStockError extends Error {
  constructor(public productId: number) {
    super(`Insufficient stock for product ${productId}`);
    this.name = "OrderStockError";
  }
}

/**
 * NW-DATA-01: create the order and decrement stock ATOMICALLY in a single DB
 * transaction. If any item can't be reserved (atomic `stock >= quantity`
 * guard), the whole transaction rolls back — no orphan order row, no partial
 * stock change. Replaces the previous non-atomic createOrder + separate
 * decrement + best-effort compensation.
 */
export async function createOrderWithStock(
  data: InsertOrder,
  items: { id: string; quantity: number }[],
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    await tx.insert(orders).values(data);
    for (const item of items) {
      const productId = Number(item.id);
      if (!Number.isInteger(productId) || productId <= 0) continue;
      const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
      if (quantity === 0) continue;
      const existing = await tx
        .select({ id: productStock.id })
        .from(productStock)
        .where(eq(productStock.productId, productId))
        .limit(1);
      if (existing.length === 0) {
        // Mirror the store's default (see NW-DATA-03): unconfigured products
        // start at 100 units.
        await tx.insert(productStock).values({ productId, stock: 100, lowStockThreshold: 10 });
      }
      const res = await tx
        .update(productStock)
        .set({ stock: sql`${productStock.stock} - ${quantity}` })
        .where(and(eq(productStock.productId, productId), sql`${productStock.stock} >= ${quantity}`));
      const affected = (res as unknown as [{ affectedRows?: number }])?.[0]?.affectedRows ?? 0;
      if (affected === 0) {
        throw new OrderStockError(productId); // rolls back the whole transaction
      }
    }
    const result = await tx.select().from(orders).where(eq(orders.id, data.id)).limit(1);
    return result[0];
  });
}

export async function getOrdersByCustomerId(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/** Look up an order by its stored gateway payment id — used to reconcile refund webhooks. */
export async function getOrderByPaymentId(paymentId: string) {
  const db = await getDb();
  if (!db || !paymentId) return null;
  const result = await db.select().from(orders).where(eq(orders.paymentId, paymentId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/** Look up an order by its courier AWB (tracking) number — used by courier status webhooks. */
export async function getOrderByAwb(awb: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(orders).where(eq(orders.awbCode, awb)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Get recent orders by phone number (for WhatsApp chatbot auto-track).
 * Returns latest 5 orders sorted by createdAt desc.
 */
export async function getOrdersByPhone(phone: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Normalize: strip non-digits, remove leading 91 if present
  const clean = phone.replace(/\D/g, "");
  const phoneVariants = clean.startsWith("91") && clean.length > 10
    ? [clean, clean.slice(2)]
    : [clean, `91${clean}`];
  return db.select().from(orders)
    .where(or(...phoneVariants.map(p => eq(orders.phone, p))))
    .orderBy(desc(orders.createdAt))
    .limit(5);
}

export async function getAllOrders(opts?: { limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const limit = Math.min(opts?.limit || 200, 500);
  const offset = opts?.offset || 0;
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit).offset(offset);
}

export async function updateOrderStatus(id: string, status: string, data: { amountPaid?: number } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Partial<InsertOrder> = { status: status as any };
  if (typeof data.amountPaid === "number") {
    updateData.amountPaid = Math.max(0, Math.round(data.amountPaid));
  }
  await db.update(orders).set(updateData).where(eq(orders.id, id));
  return getOrderById(id);
}

/** Persist the gateway payment id on an order (captured after payment verification)
 *  so refunds can be issued later. Best-effort. (Columns ensured by getDb →
 *  ensureRuntimeColumns.) */
export async function setOrderPaymentId(id: string, paymentId: string | null | undefined) {
  const db = await getDb();
  if (!db || !paymentId) return;
  try {
    await db.update(orders).set({ paymentId } as Partial<InsertOrder>).where(eq(orders.id, id));
  } catch (e) { console.error("[order] setOrderPaymentId failed", e); }
}

/** Record a refund against an order (caller passes the new cumulative
 *  refundedAmount + resulting status). */
export async function recordRefund(id: string, refundedAmount: number, refundStatus: "none" | "partial" | "full" | "failed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders)
    .set({ refundedAmount: Math.max(0, Math.round(refundedAmount)), refundStatus } as Partial<InsertOrder>)
    .where(eq(orders.id, id));
  return getOrderById(id);
}

export async function updateOrderShipping(id: string, data: { awbCode?: string; trackingUrl?: string; shippingProvider?: string; status?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = {};
  if (data.awbCode) updateData.awbCode = data.awbCode;
  if (data.trackingUrl) updateData.trackingUrl = data.trackingUrl;
  if (data.shippingProvider) updateData.shippingProvider = data.shippingProvider;
  if (data.status) updateData.status = data.status;
  await db.update(orders).set(updateData).where(eq(orders.id, id));
  return getOrderById(id);
}

/** Get order by ID for customer tracking (public — no auth needed) */
export async function getOrderByIdForTracking(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({
    id: orders.id,
    customerId: orders.customerId,
    status: orders.status,
    awbCode: orders.awbCode,
    trackingUrl: orders.trackingUrl,
    shippingProvider: orders.shippingProvider,
    createdAt: orders.createdAt,
    updatedAt: orders.updatedAt,
    customerName: orders.customerName,
    total: orders.total,
    paymentMethod: orders.paymentMethod,
    address: orders.address,
    city: orders.city,
    state: orders.state,
    pincode: orders.pincode,
    items: orders.items,
  }).from(orders).where(eq(orders.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ─── Product Reviews ─────────────────────────────────────────────────────────────────

// Self-migrate: add the images JSON column if it doesn't exist yet.
let _reviewImagesReady = false;
async function ensureReviewImagesColumn(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  if (_reviewImagesReady) return;
  try {
    await db.execute(sql.raw(
      "ALTER TABLE `productReviews` ADD COLUMN `images` JSON DEFAULT NULL"
    ));
  } catch (e: any) {
    const full = `${e?.cause?.message || ""} ${e?.message || ""} ${e || ""}`;
    if (!full.includes("Duplicate column")) {
      console.error("[Reviews] ensureReviewImagesColumn failed:", e);
    }
  }
  _reviewImagesReady = true;
}

export async function getReviewsByProductId(productId: number, status: string = 'approved') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureReviewImagesColumn(db);
  return db.select().from(productReviews)
    .where(and(
      eq(productReviews.productId, productId),
      eq(productReviews.status, status as any),
    ))
    .orderBy(desc(productReviews.createdAt));
}

export async function getProductRatingStats(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const reviews = await db.select({
    rating: productReviews.rating,
  }).from(productReviews)
    .where(and(
      eq(productReviews.productId, productId),
      eq(productReviews.status, 'approved' as any),
    ));
  const totalReviews = reviews.length;
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of reviews) {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    sum += r.rating;
  }
  const avgRating = totalReviews > 0 ? sum / totalReviews : 0;
  return { avgRating, totalReviews, distribution };
}

export async function addProductReview(data: Omit<InsertProductReview, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureReviewImagesColumn(db);

  // Check for duplicate review (one per customer per product)
  if (data.customerId && data.customerId > 0) {
    const existing = await db.select({ id: productReviews.id }).from(productReviews)
      .where(and(
        eq(productReviews.productId, data.productId),
        eq(productReviews.customerId, data.customerId),
      )).limit(1);
    if (existing.length > 0) throw new Error("You have already reviewed this product.");
  }

  // Check if customer actually ordered this product → set verified
  let verified = data.verified ?? false;
  if (data.customerId && data.customerId > 0) {
    const customerOrders = await db.select({ items: orders.items, id: orders.id }).from(orders)
      .where(and(
        eq(orders.customerId, data.customerId),
        eq(orders.status, 'delivered' as any),
      ));
    for (const order of customerOrders) {
      const items = (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) as Array<{ id?: number; productId?: number }>;
      if (items.some(item => (item.id || item.productId) === data.productId)) {
        verified = true;
        break;
      }
    }
  }

  await db.insert(productReviews).values({ ...data, verified });
  const result = await db.select().from(productReviews)
    .where(eq(productReviews.productId, data.productId))
    .orderBy(desc(productReviews.createdAt)).limit(1);
  // Recompute product rating & reviewCount
  await recomputeProductRating(data.productId);
  return result[0];
}

/** Recompute product rating & reviewCount from all reviews */
export async function recomputeProductRating(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const allReviews = await db.select({ rating: productReviews.rating })
    .from(productReviews).where(eq(productReviews.productId, productId));
  if (allReviews.length === 0) {
    await db.update(products).set({ rating: 0, reviewCount: 0 })
      .where(eq(products.id, productId));
  } else {
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    const avgScaled = Math.round(avg * 10);
    await db.update(products).set({ rating: avgScaled, reviewCount: allReviews.length })
      .where(eq(products.id, productId));
  }
}

export async function updateReviewStatus(reviewId: number, status: 'pending' | 'approved' | 'rejected') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(productReviews)
    .set({ status })
    .where(eq(productReviews.id, reviewId));
  const result = await db.select().from(productReviews).where(eq(productReviews.id, reviewId)).limit(1);
  return result[0] ?? null;
}

export async function getAdminReviews(status?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = status ? [eq(productReviews.status, status as any)] : [];
  const reviews = await db.select({
    id: productReviews.id,
    productId: productReviews.productId,
    customerId: productReviews.customerId,
    customerName: productReviews.customerName,
    orderId: productReviews.orderId,
    rating: productReviews.rating,
    title: productReviews.title,
    body: productReviews.body,
    verified: productReviews.verified,
    status: productReviews.status,
    helpfulCount: productReviews.helpfulCount,
    createdAt: productReviews.createdAt,
    productName: products.name,
  }).from(productReviews)
    .leftJoin(products, eq(productReviews.productId, products.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(productReviews.createdAt));

  return reviews;
}

export async function markReviewHelpful(reviewId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(productReviews)
    .set({ helpfulCount: sql`${productReviews.helpfulCount} + 1` })
    .where(eq(productReviews.id, reviewId));
  const result = await db.select().from(productReviews).where(eq(productReviews.id, reviewId)).limit(1);
  return result[0] ?? null;
}

export async function getReviewsByCustomerId(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select({
    id: productReviews.id,
    productId: productReviews.productId,
    customerId: productReviews.customerId,
    customerName: productReviews.customerName,
    rating: productReviews.rating,
    title: productReviews.title,
    body: productReviews.body,
    verified: productReviews.verified,
    status: productReviews.status,
    helpfulCount: productReviews.helpfulCount,
    createdAt: productReviews.createdAt,
    productName: products.name,
  }).from(productReviews)
    .leftJoin(products, eq(productReviews.productId, products.id))
    .where(eq(productReviews.customerId, customerId))
    .orderBy(desc(productReviews.createdAt));
}

/** Get all reviews with product name, sorted newest first */
export async function getAllReviews() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select({
    id: productReviews.id,
    productId: productReviews.productId,
    productName: products.name,
    customerId: productReviews.customerId,
    customerName: productReviews.customerName,
    rating: productReviews.rating,
    title: productReviews.title,
    body: productReviews.body,
    verified: productReviews.verified,
    status: productReviews.status,
    helpfulCount: productReviews.helpfulCount,
    createdAt: productReviews.createdAt,
  }).from(productReviews)
    .leftJoin(products, eq(productReviews.productId, products.id))
    .orderBy(desc(productReviews.createdAt));
}

/** Delete a review by id, return the productId for recomputation */
export async function deleteReview(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const review = await db.select({ productId: productReviews.productId })
    .from(productReviews).where(eq(productReviews.id, id)).limit(1);
  if (review.length === 0) return null;
  const productId = review[0].productId;
  await db.delete(productReviews).where(eq(productReviews.id, id));
  await recomputeProductRating(productId);
  return productId;
}

/** Mark a review as verified purchase */
export async function markReviewVerified(reviewId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(productReviews).set({ verified: true })
    .where(eq(productReviews.id, reviewId));
}

// ─── WhatsApp Subscribers ─────────────────────────────────────────────────────────────────

export async function subscribeWhatsapp(phone: string, name?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(whatsappSubscribers).values({ phone, name })
    .onDuplicateKeyUpdate({ set: { name: name || undefined } });
  const result = await db.select().from(whatsappSubscribers).where(eq(whatsappSubscribers.phone, phone)).limit(1);
  return result[0];
}

export async function subscribeEmail(email: string, name?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(emailSubscribers).values({ email: email.toLowerCase().trim(), name })
    .onDuplicateKeyUpdate({ set: { name: name || undefined } });
  const result = await db.select().from(emailSubscribers).where(eq(emailSubscribers.email, email.toLowerCase().trim())).limit(1);
  return result[0];
}

export async function getEmailSubscribersList() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emailSubscribers).orderBy(desc(emailSubscribers.createdAt));
}

/** True if this phone (WhatsApp list) or email is already a newsletter subscriber. */
export async function isNewsletterSubscribed(opts: { phone?: string; email?: string }): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    if (opts.phone) {
      const r = await db.select({ phone: whatsappSubscribers.phone }).from(whatsappSubscribers)
        .where(eq(whatsappSubscribers.phone, opts.phone)).limit(1);
      if (r.length) return true;
    }
    if (opts.email) {
      const r = await db.select({ email: emailSubscribers.email }).from(emailSubscribers)
        .where(eq(emailSubscribers.email, opts.email.toLowerCase().trim())).limit(1);
      if (r.length) return true;
    }
  } catch { /* ignore */ }
  return false;
}

// ─── Blog Posts ─────────────────────────────────────────────────────────────────

export async function getBlogPosts(limit = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(blogPosts)
    .where(eq(blogPosts.published, true))
    .orderBy(desc(blogPosts.createdAt))
    .limit(limit);
}

export async function getBlogPostBySlug(slug: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ─── Blog Admin CRUD ─────────────────────────────────────────────────────────
export async function getAllBlogPostsAdmin() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
}

export async function getBlogPostById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createBlogPost(data: {
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  category?: string;
  tags?: string;
  author?: string;
  seoTitle?: string;
  seoDescription?: string;
  status?: string;
  published?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(blogPosts).values({
    ...data,
    status: data.status ?? "draft",
    published: data.published ?? false,
  });
  const result = await db.select().from(blogPosts).where(eq(blogPosts.slug, data.slug)).limit(1);
  return result[0];
}

export async function updateBlogPost(id: number, data: Partial<{
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string;
  author: string;
  seoTitle: string;
  seoDescription: string;
  status: string;
  published: boolean;
  publishedAt: Date | null;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(blogPosts).set(data).where(eq(blogPosts.id, id));
  const result = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return result[0];
}

export async function deleteBlogPost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
  return { success: true };
}

// ─── Coupons ─────────────────────────────────────────────────────────────────

// Self-migrate: add isFeatured column to existing coupons table
let _couponsMigrated = false;
async function ensureCouponsColumns(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  if (_couponsMigrated) return;
  try {
    await db.execute(sql.raw(
      "ALTER TABLE `coupons` ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT FALSE"
    ));
  } catch {
    // Column already exists — ignore
  }
  try {
    await db.execute(sql.raw(
      "ALTER TABLE `coupons` ADD COLUMN `perUserLimit` INT NOT NULL DEFAULT 0"
    ));
  } catch {
    // Column already exists — ignore
  }
  _couponsMigrated = true;
}

/** How many non-cancelled orders this customer has placed using a coupon code.
 *  Used to enforce a per-customer coupon limit (NW-DATA-02). */
export async function countCustomerCouponUses(customerId: number, code: string): Promise<number> {
  const db = await getDb();
  if (!db || !customerId || !code) return 0;
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(orders)
    .where(and(
      eq(orders.customerId, customerId),
      eq(orders.couponCode, code.toUpperCase()),
      ne(orders.status, "cancelled"),
    ));
  return Number(rows?.[0]?.n ?? 0);
}

/** Fetch a coupon by code (uppercased), or null. */
export async function getCouponByCode(code: string): Promise<typeof coupons.$inferSelect | null> {
  const db = await getDb();
  if (!db || !code) return null;
  await ensureCouponsColumns(db);
  const result = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase())).limit(1);
  return result[0] ?? null;
}

export async function getFeaturedCoupons() {
  const db = await getDb();
  if (!db) return [];
  await ensureCouponsColumns(db);
  const now = new Date();
  return db.select({
    code: coupons.code,
    description: coupons.description,
    discountType: coupons.discountType,
    discountValue: coupons.discountValue,
    minOrderAmount: coupons.minOrderAmount,
  }).from(coupons).where(
    and(
      eq(coupons.isActive, true),
      eq(coupons.isFeatured, true),
      or(
        sql`${coupons.expiresAt} IS NULL`,
        sql`${coupons.expiresAt} > ${now}`,
      ),
    )
  );
}

/// Public list of ALL active, non-expired, non-exhausted coupons for display
/// in the app/storefront (not just featured ones). Safe display fields only.
export async function getActiveCoupons() {
  const db = await getDb();
  if (!db) return [];
  await ensureCouponsColumns(db);
  const now = new Date();
  return db.select({
    code: coupons.code,
    description: coupons.description,
    discountType: coupons.discountType,
    discountValue: coupons.discountValue,
    minOrderAmount: coupons.minOrderAmount,
    isFeatured: coupons.isFeatured,
  }).from(coupons).where(
    and(
      eq(coupons.isActive, true),
      or(
        sql`${coupons.expiresAt} IS NULL`,
        sql`${coupons.expiresAt} > ${now}`,
      ),
      // Not fully used up (0 = unlimited)
      or(
        eq(coupons.maxUses, 0),
        sql`${coupons.usedCount} < ${coupons.maxUses}`,
      ),
    )
  ).orderBy(desc(coupons.isFeatured), desc(coupons.createdAt));
}

export async function getAllCoupons(opts?: { limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureCouponsColumns(db);
  const limit = Math.min(opts?.limit || 200, 500);
  const offset = opts?.offset || 0;
  return db.select().from(coupons).orderBy(desc(coupons.createdAt)).limit(limit).offset(offset);
}

export async function createCoupon(data: InsertCoupon) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(coupons).values({ ...data, code: data.code.toUpperCase() });
  const result = await db.select().from(coupons).where(eq(coupons.code, data.code.toUpperCase())).limit(1);
  return result[0];
}

export async function updateCoupon(id: number, data: Partial<InsertCoupon>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(coupons).set(data).where(eq(coupons.id, id));
  const result = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  return result[0];
}

export async function deleteCoupon(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(coupons).where(eq(coupons.id, id));
  return { success: true };
}

export async function validateCoupon(code: string, cartTotal: number): Promise<{ valid: boolean; discount: number; message: string; coupon?: typeof coupons.$inferSelect }> {
  const db = await getDb();
  if (!db) return { valid: false, discount: 0, message: "Database not available" };
  const result = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase())).limit(1);
  if (!result.length) return { valid: false, discount: 0, message: "Invalid coupon code" };
  const coupon = result[0];
  if (!coupon.isActive) return { valid: false, discount: 0, message: "This coupon is no longer active" };
  if (coupon.expiresAt && new Date() > coupon.expiresAt) return { valid: false, discount: 0, message: "This coupon has expired" };
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return { valid: false, discount: 0, message: "This coupon has reached its usage limit" };
  if (cartTotal < coupon.minOrderAmount) return { valid: false, discount: 0, message: `Minimum order of ₹${coupon.minOrderAmount} required` };
  const discount = coupon.discountType === "percent"
    ? Math.round((cartTotal * coupon.discountValue) / 100)
    : Math.min(coupon.discountValue, cartTotal);
  return { valid: true, discount, message: `Coupon applied! You save ₹${discount}`, coupon };
}

/**
 * Atomically redeem one use of a coupon.
 *
 * Uses a single conditional UPDATE so concurrent checkouts can't push usedCount
 * past maxUses (the previous raw-SQL version both interpolated the code into the
 * query string and was never actually called, so maxUses was never enforced).
 * The increment only applies while the coupon is active and under its limit
 * (maxUses === 0 means unlimited). Returns true if a use was consumed.
 */
export async function incrementCouponUsage(code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const res = await db.update(coupons)
    .set({ usedCount: sql`${coupons.usedCount} + 1` })
    .where(and(
      eq(coupons.code, code.toUpperCase()),
      eq(coupons.isActive, true),
      or(eq(coupons.maxUses, 0), lt(coupons.usedCount, coupons.maxUses)),
    ));
  // drizzle/mysql2 returns [ResultSetHeader, FieldPacket[]]
  const affected = (res as unknown as [{ affectedRows?: number }])?.[0]?.affectedRows ?? 0;
  return affected > 0;
}

// ─── Product Stock ─────────────────────────────────────────────────────────────────

export async function getAllProductStock() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(productStock).orderBy(productStock.productId);
}

export async function getStockByProductId(productId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(productStock).where(eq(productStock.productId, productId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertProductStock(productId: number, stock: number, lowStockThreshold = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(productStock).values({ productId, stock, lowStockThreshold })
    .onDuplicateKeyUpdate({ set: { stock, lowStockThreshold } });
  const result = await db.select().from(productStock).where(eq(productStock.productId, productId)).limit(1);
  return result[0];
}

export async function decrementStockForOrder(items: { id: string; quantity: number }[]) {
  const db = await getDb();
  if (!db) return;
  const decremented: { productId: number; quantity: number }[] = [];
  for (const item of items) {
    const productId = Number(item.id);
    if (!Number.isInteger(productId) || productId <= 0) continue;
    const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
    if (quantity === 0) continue;
    const existing = await db.select({ id: productStock.id }).from(productStock).where(eq(productStock.productId, productId)).limit(1);
    if (existing.length === 0) {
      await db.insert(productStock).values({ productId, stock: 100, lowStockThreshold: 10 });
    }
    const res = await db.update(productStock)
      .set({ stock: sql`${productStock.stock} - ${quantity}` })
      .where(and(eq(productStock.productId, productId), sql`${productStock.stock} >= ${quantity}`));
    const affected = (res as unknown as [{ affectedRows?: number }])?.[0]?.affectedRows ?? 0;
    if (affected === 0) {
      if (decremented.length > 0) {
        await incrementStockForOrder(decremented.map(d => ({ id: String(d.productId), quantity: d.quantity })));
      }
      throw new Error(`Insufficient stock for product ${productId}`);
    }
    decremented.push({ productId, quantity });
  }
}

export async function incrementStockForOrder(items: { id: string; quantity: number }[]) {
  const db = await getDb();
  if (!db) return;
  const valid = items
    .map(i => ({ productId: Number(i.id), quantity: Math.max(0, Math.floor(Number(i.quantity) || 0)) }))
    .filter(i => Number.isInteger(i.productId) && i.productId > 0 && i.quantity > 0);
  if (valid.length === 0) return;
  const ids = valid.map(i => i.productId);
  const caseParts = valid.map(i => sql`WHEN ${productStock.productId} = ${i.productId} THEN ${productStock.stock} + ${i.quantity}`);
  await db.update(productStock)
    .set({ stock: sql`CASE ${sql.join(caseParts, sql` `)} ELSE ${productStock.stock} END` })
    .where(inArray(productStock.productId, ids));
}

// ─── Back-in-stock alerts (self-creating table) ──────────────────────────────
let _stockAlertsReady = false;
const CREATE_STOCK_ALERTS = "CREATE TABLE IF NOT EXISTS `stockAlerts` (" +
  "`id` int AUTO_INCREMENT NOT NULL," +
  "`productId` int NOT NULL," +
  "`phone` varchar(15)," +
  "`email` varchar(320)," +
  "`name` varchar(255)," +
  "`createdAt` timestamp NOT NULL DEFAULT (now())," +
  "CONSTRAINT `stockAlerts_id` PRIMARY KEY(`id`))";

async function ensureStockAlertsTable(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  if (_stockAlertsReady) return;
  try { await db.execute(sql.raw(CREATE_STOCK_ALERTS)); _stockAlertsReady = true; }
  catch (e) { console.error("[StockAlert] ensure table failed:", e); }
}

export async function addStockAlert(productId: number, phone?: string, email?: string, name?: string) {
  const db = await getDb();
  if (!db) return;
  await ensureStockAlertsTable(db);
  // Dedupe: don't add a duplicate for the same product + contact
  const existing = await db.select().from(stockAlerts).where(eq(stockAlerts.productId, productId));
  const dup = existing.some((a) => (phone && a.phone === phone) || (email && a.email === email));
  if (dup) return;
  await db.insert(stockAlerts).values({ productId, phone: phone || null, email: email || null, name: name || null });
}

export async function getStockAlertsForProduct(productId: number): Promise<StockAlert[]> {
  const db = await getDb();
  if (!db) return [];
  await ensureStockAlertsTable(db);
  return db.select().from(stockAlerts).where(eq(stockAlerts.productId, productId));
}

export async function deleteStockAlertsForProduct(productId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(stockAlerts).where(eq(stockAlerts.productId, productId));
}

export async function bulkGetProductStock(productIds: number[]) {
  const db = await getDb();
  if (!db) return [];
  if (!productIds.length) return [];
  return db.select().from(productStock).where(inArray(productStock.productId, productIds));
}

// ─── Store Settings ────────────────────────────────────────────────────────────
export async function getStoreSetting(key: string): Promise<unknown> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(storeSettings).where(eq(storeSettings.key, key)).limit(1);
  return result.length > 0 ? result[0].value : null;
}
export async function setStoreSetting(key: string, value: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(storeSettings).values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } });
  invalidateSettingsCache();
  return { key, value };
}

/**
 * Whether an automated notification type is enabled (Settings → Notifications).
 * Defaults to TRUE and is fail-open: any read/parse error returns true so a
 * misconfiguration can never silently suppress order messages to customers.
 */
export async function isNotificationEnabled(key: string): Promise<boolean> {
  try {
    const raw = await getStoreSetting("notifications");
    const prefs = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, unknown> | null;
    return prefs?.[key] !== false;
  } catch {
    return true;
  }
}
let _settingsCache: { data: Record<string, unknown>; expiresAt: number } | null = null;
const SETTINGS_CACHE_TTL_MS = 5_000;

export async function getAllStoreSettings(): Promise<Record<string, unknown>> {
  const now = Date.now();
  if (_settingsCache && now < _settingsCache.expiresAt) return _settingsCache.data;
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(storeSettings);
  const result: Record<string, unknown> = {};
  for (const row of rows) result[row.key] = row.value;
  _settingsCache = { data: result, expiresAt: now + SETTINGS_CACHE_TTL_MS };
  return result;
}

export function invalidateSettingsCache() {
  _settingsCache = null;
}
export async function bulkSetStoreSettings(settings: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const [key, value] of Object.entries(settings)) {
    await db.insert(storeSettings).values({ key, value })
      .onDuplicateKeyUpdate({ set: { value } });
  }
  invalidateSettingsCache();
  return true;
}

// ─── Abandoned Carts ──────────────────────────────────────────────────────────
export async function getAllAbandonedCarts(opts?: { limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const limit = Math.min(opts?.limit || 200, 500);
  const offset = opts?.offset || 0;
  // Full select includes source/location/sessionId (migration 0027). Before that
  // migration is applied those columns don't exist, so fall back to the legacy
  // column set and default the new fields to null — the admin page keeps working.
  let carts: any[];
  try {
    carts = await db.select().from(abandonedCarts).orderBy(desc(abandonedCarts.createdAt)).limit(limit).offset(offset);
  } catch {
    const legacy = await db.select({
      id: abandonedCarts.id,
      customerId: abandonedCarts.customerId,
      phone: abandonedCarts.phone,
      name: abandonedCarts.name,
      items: abandonedCarts.items,
      total: abandonedCarts.total,
      recovered: abandonedCarts.recovered,
      createdAt: abandonedCarts.createdAt,
      updatedAt: abandonedCarts.updatedAt,
    }).from(abandonedCarts).orderBy(desc(abandonedCarts.createdAt)).limit(limit).offset(offset);
    carts = legacy.map((c) => ({ ...c, source: null, location: null, sessionId: null }));
  }
  // Enrich each cart with the customer's city + email from their most recent
  // order (carts themselves don't capture an address), to aid recovery.
  const phones = Array.from(new Set(carts.map((c) => c.phone).filter(Boolean))) as string[];
  const byPhone: Record<string, { city?: string; email?: string }> = {};
  if (phones.length) {
    const ords = await db
      .select({ phone: orders.phone, city: orders.city, email: orders.email })
      .from(orders)
      .where(inArray(orders.phone, phones))
      .orderBy(desc(orders.createdAt));
    for (const o of ords) {
      if (o.phone && !byPhone[o.phone]) byPhone[o.phone] = { city: o.city || undefined, email: o.email || undefined };
    }
  }
  return carts.map((c) => ({
    ...c,
    city: c.phone ? byPhone[c.phone]?.city : undefined,
    email: c.phone ? byPhone[c.phone]?.email : undefined,
  }));
}
export async function upsertAbandonedCart(data: { customerId?: number; phone?: string; name?: string; items: unknown[]; total: number; sessionId?: string; source?: string; location?: string }) {
  const db = await getDb();
  if (!db) return null;
  // Dedup key: phone for logged-in users, else the anonymous browser sessionId
  // (so a guest's cart is ONE row that updates, not a new row per cart change).
  // sessionId/source/location are extra columns added by migration 0010 — all
  // writes to them are wrapped so this keeps working even before it's applied.
  const extra: Record<string, unknown> = {};
  if (data.source !== undefined) extra.source = data.source;
  if (data.location !== undefined) extra.location = data.location;
  if (data.sessionId !== undefined) extra.sessionId = data.sessionId;

  const dedupCol = data.phone
    ? abandonedCarts.phone
    : (data.sessionId ? (abandonedCarts as any).sessionId : null);
  const dedupVal = data.phone || data.sessionId;

  if (dedupCol && dedupVal) {
    try {
      const existing = await db.select().from(abandonedCarts).where(eq(dedupCol, dedupVal)).limit(1);
      if (existing.length > 0 && !existing[0].recovered) {
        await db.update(abandonedCarts)
          .set({ items: data.items, total: data.total, name: data.name ?? existing[0].name, ...extra })
          .where(eq(dedupCol, dedupVal));
        return existing[0].id;
      }
    } catch {
      // sessionId column missing (pre-migration) — retry the update without it,
      // keyed by phone only; anonymous carts fall through to a fresh insert.
      if (data.phone) {
        try {
          const existing = await db.select().from(abandonedCarts).where(eq(abandonedCarts.phone, data.phone)).limit(1);
          if (existing.length > 0 && !existing[0].recovered) {
            await db.update(abandonedCarts)
              .set({ items: data.items, total: data.total, name: data.name ?? existing[0].name })
              .where(eq(abandonedCarts.phone, data.phone));
            return existing[0].id;
          }
        } catch { /* ignore */ }
      }
    }
  }

  try {
    const result = await db.insert(abandonedCarts).values({
      customerId: data.customerId,
      phone: data.phone,
      name: data.name,
      items: data.items,
      total: data.total,
      ...extra,
    } as any);
    return (result as unknown as { insertId: number }).insertId;
  } catch {
    // Extra columns not migrated yet — insert core fields only.
    const result = await db.insert(abandonedCarts).values({
      customerId: data.customerId,
      phone: data.phone,
      name: data.name,
      items: data.items,
      total: data.total,
    });
    return (result as unknown as { insertId: number }).insertId;
  }
}
export async function markAbandonedCartRecovered(phone: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(abandonedCarts).set({ recovered: true }).where(eq(abandonedCarts.phone, phone));
}
export async function deleteAbandonedCart(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(abandonedCarts).where(eq(abandonedCarts.id, id));
}

// ─── Customers ─────────────────────────────────────────────────────────────────
export async function getAllCustomers(opts?: { limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const limit = Math.min(opts?.limit || 200, 500);
  const offset = opts?.offset || 0;
  return db.select().from(customerProfiles).orderBy(desc(customerProfiles.createdAt)).limit(limit).offset(offset);
}

// ─── Email campaign recipients ───────────────────────────────────────────────
// segment: "all" = every customer profile with an email; "buyers" = anyone who
// has placed an order (deduped by email). Returns lowercased, deduped, valid emails.
export async function getMarketableEmails(segment: "all" | "buyers" | "subscribers"): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const valid = (e: unknown): e is string =>
    typeof e === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim());
  let raw: string[] = [];
  if (segment === "subscribers") {
    const rows = await db.select({ email: emailSubscribers.email }).from(emailSubscribers);
    raw = rows.map((r) => r.email || "");
  } else if (segment === "buyers") {
    const rows = await db.select({ email: orders.email }).from(orders);
    raw = rows.map((r) => r.email || "");
  } else {
    const profileRows = await db.select({ email: customerProfiles.email }).from(customerProfiles);
    const subRows = await db.select({ email: emailSubscribers.email }).from(emailSubscribers);
    raw = [...profileRows.map((r) => r.email || ""), ...subRows.map((r) => r.email || "")];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of raw) {
    const norm = (e || "").trim().toLowerCase();
    if (valid(norm) && !seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
    }
  }
  return out;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const db = await getDb();
  const empty = { totalOrders: 0, totalRevenue: 0, totalCustomers: 0, pendingOrders: 0, recentOrders: [], totalProducts: 0, outOfStockProducts: 0, revenueByDay: [] as { date: string; revenue: number; orders: number }[], topProducts: [] as { id: number; name: string; count: number; revenue: number }[] };
  if (!db) return empty;

  // "Top products" and the revenue chart are computed over a recent window so the
  // dashboard doesn't load the entire orders table (with its JSON items) into
  // memory on every view. Scalar totals stay all-time but are aggregated in SQL.
  const TOP_PRODUCTS_WINDOW_DAYS = 90;
  const windowStart = new Date(Date.now() - TOP_PRODUCTS_WINDOW_DAYS * 86400000);

  const [orderAggRows, custAggRows, stockAggRows, recentOrders, windowOrders] = await Promise.all([
    // All-time scalar aggregates — counted in SQL, no row loading.
    db.select({
      totalOrders: count(),
      totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} <> 'cancelled' THEN ${orders.total} ELSE 0 END), 0)`,
      pendingOrders: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} IN ('placed','processing') THEN 1 ELSE 0 END), 0)`,
    }).from(orders),
    db.select({ totalCustomers: count() }).from(customerProfiles),
    // Count ALL products (not just ones with a stock row); out-of-stock still
    // comes from productStock entries explicitly set to 0.
    db.select({
      totalProducts: count(),
      outOfStockProducts: sql<number>`COALESCE((SELECT SUM(CASE WHEN ${productStock.stock} = 0 THEN 1 ELSE 0 END) FROM ${productStock}), 0)`,
    }).from(products),
    // Recent orders for the table — bounded to 10.
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(10),
    // Non-cancelled orders within the window — feeds the 7-day chart and top products.
    db.select({ total: orders.total, items: orders.items, createdAt: orders.createdAt })
      .from(orders)
      .where(and(gte(orders.createdAt, windowStart), ne(orders.status, "cancelled")))
      .orderBy(desc(orders.createdAt)),
  ]);

  const orderAgg = orderAggRows[0];
  const stockAgg = stockAggRows[0];

  // Revenue by day (last 7 days) — bucketed in JS to preserve local-day (IST) boundaries.
  const now = Date.now();
  const revenueByDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const dayOrders = windowOrders.filter(o => {
      const od = new Date(o.createdAt);
      return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth() && od.getDate() === d.getDate();
    });
    return { date: label, revenue: dayOrders.reduce((s, o) => s + o.total, 0), orders: dayOrders.length };
  });

  // Top products by quantity over the window (items is a JSON array per order).
  const productMap: Record<string, { id: number; name: string; count: number; revenue: number }> = {};
  for (const o of windowOrders) {
    const items = (o.items as any[]) ?? [];
    for (const item of items) {
      const key = String(item.id ?? item.name);
      if (!productMap[key]) productMap[key] = { id: item.id ?? 0, name: item.name ?? "", count: 0, revenue: 0 };
      productMap[key].count += item.quantity ?? 1;
      productMap[key].revenue += (item.price ?? 0) * (item.quantity ?? 1);
    }
  }
  const topProducts = Object.values(productMap).sort((a, b) => b.count - a.count).slice(0, 5);

  return {
    totalOrders: Number(orderAgg?.totalOrders ?? 0),
    totalRevenue: Number(orderAgg?.totalRevenue ?? 0),
    totalCustomers: Number(custAggRows[0]?.totalCustomers ?? 0),
    pendingOrders: Number(orderAgg?.pendingOrders ?? 0),
    recentOrders,
    totalProducts: Number(stockAgg?.totalProducts ?? 0),
    outOfStockProducts: Number(stockAgg?.outOfStockProducts ?? 0),
    revenueByDay,
    topProducts,
  };
}

// ─── Frequently Bought Together ──────────────────────────────────────────────

/**
 * Find products frequently bought together with a given product, based on real
 * order data.  Orders store items as a JSON array in `orders.items`, where each
 * element has an `id` field (product ID, stored as a string or number).
 *
 * Strategy (pure SQL, no application-level joins):
 *  1. Find all orders whose `items` JSON contains the target productId.
 *  2. For each of those orders, extract every product-id from the JSON array.
 *  3. Exclude the original productId, count frequency, pick the top N.
 *  4. Join with `products` to return full product rows.
 */
export async function getFrequentlyBoughtTogether(productId: number, limit = 4) {
  const db = await getDb();
  if (!db) return [];

  // TiDB / MySQL 8 support JSON_TABLE which can unnest a JSON array.
  // orders.items looks like: [{"id":"5","name":"...","quantity":1,...}, ...]
  // We use a raw SQL query for the aggregation, then hydrate with Drizzle.
  const coProductRows = await db.execute(sql`
    SELECT
      CAST(jt.pid AS UNSIGNED) AS coProductId,
      COUNT(*)                 AS freq
    FROM ${orders}
    CROSS JOIN JSON_TABLE(
      ${orders.items},
      '$[*]' COLUMNS (pid VARCHAR(20) PATH '$.id')
    ) AS jt
    WHERE
      ${orders.id} IN (
        SELECT o2.id
        FROM ${orders} AS o2
        CROSS JOIN JSON_TABLE(
          o2.items,
          '$[*]' COLUMNS (pid2 VARCHAR(20) PATH '$.id')
        ) AS jt2
        WHERE CAST(jt2.pid2 AS UNSIGNED) = ${productId}
          AND o2.status NOT IN ('cancelled', 'pending_payment')
      )
      AND CAST(jt.pid AS UNSIGNED) != ${productId}
      AND ${orders.status} NOT IN ('cancelled', 'pending_payment')
    GROUP BY coProductId
    ORDER BY freq DESC
    LIMIT ${limit}
  `);

  // coProductRows is [{ coProductId: number, freq: number }, ...]
  const rows = (coProductRows as any)[0] as { coProductId: number; freq: number }[];
  if (!rows || rows.length === 0) return [];

  const ids = rows.map(r => Number(r.coProductId)).filter(id => id > 0);
  if (ids.length === 0) return [];

  // Fetch full product details (only published & available)
  const result = await db.select().from(products)
    .where(and(
      inArray(products.id, ids),
      eq(products.status, "published"),
    ));

  // Sort by original frequency order
  const orderMap = new Map(ids.map((id, i) => [id, i]));
  result.sort((a, b) => (orderMap.get(a.id) ?? 99) - (orderMap.get(b.id) ?? 99));

  return attachImages(db, result);
}

// ─── Products ─────────────────────────────────────────────────────────────────

async function attachImages<T extends { id: number }>(
  db: ReturnType<typeof drizzle>,
  prods: T[],
): Promise<(T & { images: string[] })[]> {
  if (prods.length === 0) return [];
  const ids = prods.map(p => p.id);
  const allImgs = await db
    .select({ productId: productImages.productId, url: productImages.url })
    .from(productImages)
    .where(inArray(productImages.productId, ids))
    .orderBy(productImages.sortOrder, productImages.createdAt);
  const map = new Map<number, string[]>();
  for (const img of allImgs) {
    if (!map.has(img.productId)) map.set(img.productId, []);
    map.get(img.productId)!.push(img.url);
  }
  return prods.map(p => ({ ...p, images: map.get(p.id) || [] }));
}

export async function getAllProducts(opts?: { category?: string; available?: boolean; search?: string; adminMode?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [];
  // Public storefront only shows published products; admin sees all
  if (!opts?.adminMode) conditions.push(eq(products.status, "published"));
  if (opts?.category) conditions.push(eq(products.category, opts.category));
  if (opts?.available !== undefined) conditions.push(eq(products.available, opts.available));
  if (opts?.search) {
    conditions.push(or(
      like(products.name, `%${opts.search}%`),
      like(products.category, `%${opts.search}%`)
    ));
  }
  const limit = opts?.adminMode ? 1000 : 500;
  const query = db.select().from(products);
  let result;
  if (conditions.length > 0) {
    result = await query.where(and(...conditions)).orderBy(products.sortOrder, products.id).limit(limit);
  } else {
    result = await query.orderBy(products.sortOrder, products.id).limit(limit);
  }

  return attachImages(db, result);
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (result.length === 0) return null;
  
  const product = result[0];
  // Fetch images from productImages table
  const images = await db.select().from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(productImages.sortOrder, productImages.createdAt);
  
  // Return product with images array
  return {
    ...product,
    images: images.map(img => img.url) // Array of image URLs in order
  };
}

export async function getProductByHandle(handle: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(products)
    .where(and(eq(products.handle, handle), eq(products.status, "published")))
    .limit(1);
  if (result.length === 0) return null;
  
  const product = result[0];
  // Fetch all images from productImages table
  const images = await db.select().from(productImages)
    .where(eq(productImages.productId, product.id))
    .orderBy(productImages.sortOrder, productImages.createdAt);
  
  return {
    ...product,
    images: images.map(img => img.url)
  };
}

export async function getBestsellers(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(products)
    .where(and(eq(products.isBestseller, true), eq(products.available, true), eq(products.status, "published")))
    .orderBy(products.sortOrder, products.id)
    .limit(limit);

  return attachImages(db, result);
}

export async function getTrendingProducts(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(products)
    .where(and(eq(products.isTrending, true), eq(products.available, true), eq(products.status, "published")))
    .orderBy(products.sortOrder, products.id)
    .limit(limit);

  return attachImages(db, result);
}

/** Rename a category: move every product from oldName to newName. */
export async function renameProductCategory(oldName: string, newName: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  await db.update(products).set({ category: newName }).where(eq(products.category, oldName));
  return 1;
}

export async function getProductsByCategory(category: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(products)
    .where(and(eq(products.category, category), eq(products.status, "published")))
    .orderBy(products.sortOrder, products.id)
    .limit(limit);

  return attachImages(db, result);
}

export async function getProductsByIds(ids: number[]) {
  const db = await getDb();
  if (!db) return [];
  if (!ids.length) return [];
  const result = await db.select().from(products).where(inArray(products.id, ids));
  return attachImages(db, result);
}

export async function getRecommendedProducts(cartProductIds: number[], limit = 4) {
  const db = await getDb();
  if (!db) return [];

  // If cart is empty, return bestsellers
  if (!cartProductIds.length) {
    return getBestsellers(limit);
  }

  // Get the categories of products in the cart
  const cartProducts = await db.select({ category: products.category })
    .from(products)
    .where(inArray(products.id, cartProductIds));

  const categories = [...new Set(cartProducts.map(p => p.category))];

  if (categories.length > 0) {
    // Find products from the same categories, excluding cart items
    const conditions = [
      inArray(products.category, categories),
      notInArray(products.id, cartProductIds),
      eq(products.available, true),
      eq(products.status, "published"),
    ];
    const result = await db.select().from(products)
      .where(and(...conditions))
      .orderBy(sql`RAND()`)
      .limit(limit);

    if (result.length > 0) {
      return attachImages(db, result);
    }
  }

  // Fallback to bestsellers if no category matches
  const fallback = await db.select().from(products)
    .where(and(
      eq(products.isBestseller, true),
      eq(products.available, true),
      eq(products.status, "published"),
      notInArray(products.id, cartProductIds),
    ))
    .orderBy(products.sortOrder, products.id)
    .limit(limit);

  return attachImages(db, fallback);
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(products).values(data);
  const insertId = (result as unknown as { insertId: number }).insertId;
  await db.insert(productStock).values({ productId: insertId, stock: 100, lowStockThreshold: 10 })
    .onDuplicateKeyUpdate({ set: { stock: 100 } });
  const row = await db.select().from(products).where(eq(products.id, insertId)).limit(1);
  return row[0];
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set(data).where(eq(products.id, id));
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(products).where(eq(products.id, id));
  return { success: true };
}

export async function bulkInsertProducts(data: InsertProduct[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!data.length) return;
  // Insert in batches of 20 to avoid query size limits
  for (let i = 0; i < data.length; i += 20) {
    const batch = data.slice(i, i + 20);
    await db.insert(products).values(batch).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  }
}

export async function getProductCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.execute('SELECT COUNT(*) as count FROM products');
  // db.execute may return [rows, fields] (mysql2) or rows directly — handle both.
  const rows = (Array.isArray(result) && Array.isArray((result as any)[0]) ? (result as any)[0] : result) as Array<{ count: number }>;
  return Number(rows?.[0]?.count ?? 0);
}

// ─── Page Views / Analytics ──────────────────────────────────────────────────

import { gte, ne, count } from "drizzle-orm";

export async function logPageView(data: InsertPageView) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(pageViews).values(data).$returningId();
  return result;
}

export async function getPageViews(since: Date) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pageViews).where(gte(pageViews.createdAt, since)).orderBy(desc(pageViews.createdAt));
}

// Visits whose referrer is one of our own dev / preview / dashboard environments.
// Excluded from analytics so the dashboard reflects real visitors, not our own
// testing traffic. Direct visits (referrer NULL) and real self-referrals from
// the live site (foodondoor.com / nutriwow.vercel.app) are kept.
function notInternalTraffic() {
  return sql`(${pageViews.referrer} IS NULL OR (
    ${pageViews.referrer} NOT LIKE '%manus.computer%'
    AND ${pageViews.referrer} NOT LIKE '%manus.im%'
    AND ${pageViews.referrer} NOT LIKE '%manus.space%'
    AND ${pageViews.referrer} NOT LIKE '%vercel.com%'
    AND ${pageViews.referrer} NOT LIKE '%localhost%'
    AND ${pageViews.referrer} NOT LIKE '%127.0.0.1%'
    AND ${pageViews.referrer} NOT LIKE '%-amithkukllod777s-projects.vercel.app%'
  ))`;
}

export async function getPageViewStats(since: Date) {
  const db = await getDb();
  if (!db) return { totalViews: 0, uniqueSessions: 0, topPages: [], referrers: [], devices: [], browsers: [], countries: [] };

  const base = and(gte(pageViews.createdAt, since), notInternalTraffic());

  // Total views
  const [totalResult] = await db.select({ count: count() }).from(pageViews).where(base);
  const totalViews = totalResult?.count || 0;

  // Unique sessions
  const [sessionResult] = await db.select({ count: sql<number>`COUNT(DISTINCT ${pageViews.sessionId})` }).from(pageViews).where(base);
  const uniqueSessions = sessionResult?.count || 0;

  // Top pages
  const topPages = await db.select({
    path: pageViews.path,
    views: count(),
  }).from(pageViews).where(base).groupBy(pageViews.path).orderBy(desc(count())).limit(20);

  // Referrers
  const referrers = await db.select({
    referrer: pageViews.referrer,
    views: count(),
  }).from(pageViews).where(and(base, sql`${pageViews.referrer} IS NOT NULL AND ${pageViews.referrer} != ''`)).groupBy(pageViews.referrer).orderBy(desc(count())).limit(10);

  // Devices
  const devices = await db.select({
    device: pageViews.device,
    views: count(),
  }).from(pageViews).where(and(base, sql`${pageViews.device} IS NOT NULL`)).groupBy(pageViews.device).orderBy(desc(count()));

  // Browsers
  const browsers = await db.select({
    browser: pageViews.browser,
    views: count(),
  }).from(pageViews).where(and(base, sql`${pageViews.browser} IS NOT NULL`)).groupBy(pageViews.browser).orderBy(desc(count())).limit(10);

  // Countries
  const countries = await db.select({
    country: pageViews.country,
    views: count(),
  }).from(pageViews).where(and(base, sql`${pageViews.country} IS NOT NULL AND ${pageViews.country} != ''`)).groupBy(pageViews.country).orderBy(desc(count())).limit(10);

  return { totalViews, uniqueSessions, topPages, referrers, devices, browsers, countries };
}

export async function getDailyPageViews(since: Date) {
  const db = await getDb();
  if (!db) return [];
  // Fetch the raw rows (same filter as getPageViewStats) and bucket by calendar
  // day in JS. The previous SQL `GROUP BY DATE(createdAt)` errored on TiDB,
  // leaving the Daily Traffic chart empty even when stats showed views.
  const rows = await db.select({
    createdAt: pageViews.createdAt,
    sessionId: pageViews.sessionId,
  }).from(pageViews).where(and(gte(pageViews.createdAt, since), notInternalTraffic()));

  const byDate = new Map<string, { views: number; sessions: Set<string> }>();
  for (const r of rows) {
    const d = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt as unknown as string);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    let bucket = byDate.get(key);
    if (!bucket) { bucket = { views: 0, sessions: new Set<string>() }; byDate.set(key, bucket); }
    bucket.views++;
    if (r.sessionId) bucket.sessions.add(r.sessionId);
  }
  return Array.from(byDate.entries())
    .map(([date, b]) => ({ date, views: b.views, uniqueVisitors: b.sessions.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Product Images ───────────────────────────────────────────────────────────

export async function getProductImages(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(productImages.sortOrder, productImages.createdAt);
}

export async function addProductImage(data: Omit<InsertProductImage, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Count existing images for this product
  const existing = await db.select().from(productImages).where(eq(productImages.productId, data.productId));
  if (existing.length >= 8) throw new Error("Maximum 8 images per product allowed");
  // If this is the first image, make it hero automatically
  const isFirst = existing.length === 0;
  await db.insert(productImages).values({
    ...data,
    isHero: isFirst ? true : (data.isHero ?? false),
    sortOrder: data.sortOrder ?? existing.length,
  });
  // If first image, also update products.image field
  if (isFirst) {
    await db.update(products).set({ image: data.url }).where(eq(products.id, data.productId));
  }
  const result = await db.select().from(productImages)
    .where(eq(productImages.productId, data.productId))
    .orderBy(desc(productImages.createdAt))
    .limit(1);
  return result[0];
}

export async function setHeroProductImage(imageId: number, productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Clear all hero flags for this product
  await db.update(productImages).set({ isHero: false }).where(eq(productImages.productId, productId));
  // Set the new hero
  await db.update(productImages).set({ isHero: true }).where(eq(productImages.id, imageId));
  // Also update the product's primary image field for backward compatibility
  const heroImg = await db.select().from(productImages).where(eq(productImages.id, imageId)).limit(1);
  if (heroImg[0]) {
    await db.update(products).set({ image: heroImg[0].url }).where(eq(products.id, productId));
  }
  return { success: true };
}

export async function deleteProductImage(imageId: number, productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const img = await db.select().from(productImages).where(eq(productImages.id, imageId)).limit(1);
  if (!img[0]) throw new Error("Image not found");
  const wasHero = img[0].isHero;
  await db.delete(productImages).where(eq(productImages.id, imageId));
  // If deleted image was hero, promote the next image
  if (wasHero) {
    const remaining = await db.select().from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(productImages.sortOrder)
      .limit(1);
    if (remaining[0]) {
      await db.update(productImages).set({ isHero: true }).where(eq(productImages.id, remaining[0].id));
      await db.update(products).set({ image: remaining[0].url }).where(eq(products.id, productId));
    }
  }
  return { success: true, fileKey: img[0].fileKey };
}

export async function reorderProductImages(productId: number, orderedIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(productImages)
      .set({ sortOrder: i })
      .where(eq(productImages.id, orderedIds[i]));
  }
  return { success: true };
}

// ─── WhatsApp Templates ────────────────────────────────────────────────────────────────────

export async function createWhatsappTemplate(data: Omit<InsertWhatsappTemplate, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(whatsappTemplates).values({
    name: data.name,
    title: data.title,
    imageUrl: data.imageUrl ?? null,
    buttonText: data.buttonText,
    buttonUrl: data.buttonUrl,
    metaTemplateId: data.metaTemplateId ?? null,
    approvalStatus: data.approvalStatus ?? 'pending',
    approvalMessage: data.approvalMessage ?? null,
  });
  const templateId = result[0].insertId;
  return db.select().from(whatsappTemplates).where(eq(whatsappTemplates.id, Number(templateId))).limit(1).then(rows => rows[0]);
}

export async function getWhatsappTemplates() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(whatsappTemplates).orderBy(whatsappTemplates.createdAt);
}

export async function getWhatsappTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(whatsappTemplates).where(eq(whatsappTemplates.id, id)).limit(1).then(rows => rows[0]);
}

export async function updateWhatsappTemplate(id: number, data: Partial<InsertWhatsappTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(whatsappTemplates).set(data).where(eq(whatsappTemplates.id, id));
  return getWhatsappTemplate(id);
}

export async function deleteWhatsappTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, id));
}

export async function uploadWhatsappContacts(campaignId: number, contacts: Array<{ name: string; phone: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const data = contacts.map(c => ({
    ...c,
    campaignId,
    status: "pending" as const,
  }));
  
  return db.insert(whatsappContacts).values(data);
}

export async function getWhatsappContacts(campaignId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(whatsappContacts).where(eq(whatsappContacts.campaignId, campaignId));
}

export async function updateWhatsappContactStatus(contactId: number, status: string, sentAt?: Date, deliveredAt?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(whatsappContacts).set({ status, sentAt, deliveredAt }).where(eq(whatsappContacts.id, contactId));
}


// ─── WhatsApp Campaigns ────────────────────────────────────────────────────────────────────

export async function getWhatsappCampaigns() {
  const db = await getDb();
  if (!db) return [];
  
  const campaigns = await db
    .select()
    .from(whatsappCampaigns)
    .orderBy(desc(whatsappCampaigns.createdAt));
  
  return campaigns;
}





// ==================== HOMEPAGE SECTIONS ====================

export async function getHomepageSectionProducts(sectionType: string) {
  const db = await getDb();
  if (!db) return [];
  
  const sections = await db.select().from(homepageSections)
    .where(eq(homepageSections.sectionType, sectionType))
    .orderBy(homepageSections.sortOrder);
  
  if (sections.length === 0) return [];
  
  const productIds = sections.map(s => s.productId);
  const prods = await db.select().from(products)
    .where(and(inArray(products.id, productIds), eq(products.status, "published")));
  
  const productsWithImages = await attachImages(db, prods);

  // Sort by the order defined in homepageSections
  const orderMap = new Map(sections.map(s => [s.productId, s.sortOrder]));
  productsWithImages.sort((a, b) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0));
  
  return productsWithImages;
}

export async function getAllHomepageSections() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(homepageSections).orderBy(homepageSections.sectionType, homepageSections.sortOrder);
}

// Consolidated endpoint: fetch all homepage data in a single call to avoid rate limiting
export async function getHomepageAllData() {
  const db = await getDb();
  if (!db) return { bestseller: [], trending: [], featured: [], explore: [], carousel: [] };

  // Parallel: fetch sections, products, and carousel in one go
  const [allSections, allProducts, carouselRaw] = await Promise.all([
    db.select().from(homepageSections).orderBy(homepageSections.sortOrder),
    db.select().from(products)
      .where(eq(products.status, "published"))
      .orderBy(products.sortOrder, products.id),
    getStoreSetting("heroCarousel"),
  ]);

  // Group by section type
  const sectionMap: Record<string, typeof allSections> = {};
  for (const s of allSections) {
    if (!sectionMap[s.sectionType]) sectionMap[s.sectionType] = [];
    sectionMap[s.sectionType].push(s);
  }

  // Get all unique product IDs from sections
  const sectionProductIds = Array.from(new Set(allSections.map(s => s.productId)));

  // Fetch all product images in one query
  const allProductIds = allProducts.map(p => p.id);
  let allImages: { productId: number; url: string }[] = [];
  if (allProductIds.length > 0) {
    allImages = await db.select({ productId: productImages.productId, url: productImages.url })
      .from(productImages)
      .where(inArray(productImages.productId, allProductIds))
      .orderBy(productImages.sortOrder, productImages.createdAt);
  }

  // Parse carousel
  let carousel: unknown[] = [];
  try {
    const v = typeof carouselRaw === "string" ? JSON.parse(carouselRaw) : carouselRaw;
    carousel = Array.isArray(v) ? v : [];
  } catch { carousel = []; }
  
  // Build image map
  const imageMap = new Map<number, string[]>();
  for (const img of allImages) {
    if (!imageMap.has(img.productId)) imageMap.set(img.productId, []);
    imageMap.get(img.productId)!.push(img.url);
  }
  
  // Helper: enrich product with images
  const enrichProduct = (product: typeof allProducts[0]) => ({
    ...product,
    images: imageMap.get(product.id) || []
  });
  
  // Build product lookup
  const productMap = new Map(allProducts.map(p => [p.id, p]));
  
  // Helper: get sorted products for a section type
  const getSectionProducts = (sectionType: string) => {
    const entries = sectionMap[sectionType] || [];
    return entries
      .map(entry => productMap.get(entry.productId))
      .filter(Boolean)
      .map(p => enrichProduct(p!));
  };
  
  const bestseller = getSectionProducts("bestseller");
  const trending = getSectionProducts("trending");
  const featured = getSectionProducts("featured");
  
  // Explore: all products NOT in bestseller/trending sections
  const sectionProductIdSet = new Set(sectionProductIds);
  const explore = allProducts
    .filter(p => !sectionProductIdSet.has(p.id))
    .slice(0, 24)
    .map(enrichProduct);
  
  return { bestseller, trending, featured, explore, carousel };
}

export async function addProductToHomepageSection(sectionType: string, productId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Get max sortOrder for this section
  const existing = await db.select().from(homepageSections)
    .where(and(eq(homepageSections.sectionType, sectionType), eq(homepageSections.productId, productId)));
  
  if (existing.length > 0) return existing[0]; // already exists
  
  const allInSection = await db.select().from(homepageSections)
    .where(eq(homepageSections.sectionType, sectionType));
  const maxOrder = allInSection.reduce((max, s) => Math.max(max, s.sortOrder), 0);
  
  await db.insert(homepageSections).values({
    sectionType,
    productId,
    sortOrder: maxOrder + 1,
  });
  
  return { sectionType, productId, sortOrder: maxOrder + 1 };
}

export async function removeProductFromHomepageSection(sectionType: string, productId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(homepageSections)
    .where(and(eq(homepageSections.sectionType, sectionType), eq(homepageSections.productId, productId)));
  return true;
}

export async function reorderHomepageSection(sectionType: string, productIds: number[]) {
  const db = await getDb();
  if (!db) return false;
  
  // Update sortOrder for each product in the section
  for (let i = 0; i < productIds.length; i++) {
    await db.update(homepageSections)
      .set({ sortOrder: i + 1 })
      .where(and(eq(homepageSections.sectionType, sectionType), eq(homepageSections.productId, productIds[i])));
  }
  return true;
}

export async function clearHomepageSection(sectionType: string) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(homepageSections).where(eq(homepageSections.sectionType, sectionType));
  return true;
}

// ─── Login OTPs ────────────────────────────────────────────────────────────────

// Self-migrate: ensure the otpCodes table exists before first use. Runs once per
// serverless instance via CREATE TABLE IF NOT EXISTS (idempotent), so OTP login
// works without a separate manual migration step.
let _otpTableReady = false;
const CREATE_OTP_TABLE = "CREATE TABLE IF NOT EXISTS `otpCodes` (" +
  "`id` int AUTO_INCREMENT NOT NULL," +
  "`phone` varchar(20) NOT NULL," +
  "`codeHash` varchar(64) NOT NULL," +
  "`expiresAt` timestamp NOT NULL," +
  "`attempts` int NOT NULL DEFAULT 0," +
  "`sendCount` int NOT NULL DEFAULT 0," +
  "`windowStartedAt` timestamp NOT NULL DEFAULT (now())," +
  "`createdAt` timestamp NOT NULL DEFAULT (now())," +
  "`updatedAt` timestamp NOT NULL DEFAULT (now())," +
  "CONSTRAINT `otpCodes_id` PRIMARY KEY(`id`)," +
  "CONSTRAINT `otpCodes_phone_unique` UNIQUE(`phone`))";

async function ensureOtpTable(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  if (_otpTableReady) return;
  try {
    await db.execute(sql.raw(CREATE_OTP_TABLE));
    _otpTableReady = true;
  } catch (e) {
    console.error("[OTP] ensureOtpTable failed:", e);
  }
}

export async function getOtpByPhone(phone: string) {
  const db = await getDb();
  if (!db) return null;
  await ensureOtpTable(db);
  const r = await db.select().from(otpCodes).where(eq(otpCodes.phone, phone)).limit(1);
  return r.length > 0 ? r[0] : null;
}

/** Upsert the active OTP for a phone (one row per phone), resetting attempts. */
export async function upsertOtp(data: {
  phone: string;
  codeHash: string;
  expiresAt: Date;
  sendCount: number;
  windowStartedAt: Date;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureOtpTable(db);
  await db.insert(otpCodes)
    .values({
      phone: data.phone,
      codeHash: data.codeHash,
      expiresAt: data.expiresAt,
      attempts: 0,
      sendCount: data.sendCount,
      windowStartedAt: data.windowStartedAt,
    })
    .onDuplicateKeyUpdate({
      set: {
        codeHash: data.codeHash,
        expiresAt: data.expiresAt,
        attempts: 0,
        sendCount: data.sendCount,
        windowStartedAt: data.windowStartedAt,
      },
    });
}

export async function incrementOtpAttempts(phone: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(otpCodes).set({ attempts: sql`${otpCodes.attempts} + 1` }).where(eq(otpCodes.phone, phone));
}

export async function deleteOtp(phone: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(otpCodes).where(eq(otpCodes.phone, phone));
}

// ─── Email Logs & Unsubscribes (self-creating tables) ─────────────────────────
let _emailTablesReady = false;
const CREATE_EMAIL_LOGS = "CREATE TABLE IF NOT EXISTS `emailLogs` (" +
  "`id` int AUTO_INCREMENT NOT NULL," +
  "`campaignId` varchar(20) NOT NULL," +
  "`email` varchar(320) NOT NULL," +
  "`messageId` varchar(255)," +
  "`status` varchar(20) NOT NULL DEFAULT 'sent'," +
  "`error` text," +
  "`openCount` int NOT NULL DEFAULT 0," +
  "`openedAt` timestamp NULL," +
  "`clickCount` int NOT NULL DEFAULT 0," +
  "`clickedAt` timestamp NULL," +
  "`sentAt` timestamp NOT NULL DEFAULT (now())," +
  "CONSTRAINT `emailLogs_id` PRIMARY KEY(`id`))";
const CREATE_EMAIL_UNSUBS = "CREATE TABLE IF NOT EXISTS `emailUnsubscribes` (" +
  "`id` int AUTO_INCREMENT NOT NULL," +
  "`email` varchar(320) NOT NULL," +
  "`reason` varchar(255)," +
  "`createdAt` timestamp NOT NULL DEFAULT (now())," +
  "CONSTRAINT `emailUnsubscribes_id` PRIMARY KEY(`id`)," +
  "CONSTRAINT `emailUnsubscribes_email_unique` UNIQUE(`email`))";

async function ensureEmailTables(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  if (_emailTablesReady) return;
  try {
    await db.execute(sql.raw(CREATE_EMAIL_LOGS));
    await db.execute(sql.raw(CREATE_EMAIL_UNSUBS));
    _emailTablesReady = true;
  } catch (e) { console.error("[EmailLog] ensure tables failed:", e); }
}

export async function createEmailLog(campaignId: string, email: string, messageId?: string, error?: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  await ensureEmailTables(db);
  const status = error ? "failed" : "sent";
  const result = await db.insert(emailLogs).values({
    campaignId, email, messageId: messageId || null, status, error: error || null,
  });
  return (result as any)[0]?.insertId ?? null;
}

export async function recordEmailOpen(logId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await ensureEmailTables(db);
  await db.update(emailLogs).set({
    openCount: sql`${emailLogs.openCount} + 1`,
    openedAt: sql`COALESCE(${emailLogs.openedAt}, NOW())`,
  }).where(eq(emailLogs.id, logId));
}

export async function recordEmailClick(logId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await ensureEmailTables(db);
  await db.update(emailLogs).set({
    clickCount: sql`${emailLogs.clickCount} + 1`,
    clickedAt: sql`COALESCE(${emailLogs.clickedAt}, NOW())`,
  }).where(eq(emailLogs.id, logId));
}

export async function getEmailLogById(logId: number): Promise<EmailLog | null> {
  const db = await getDb();
  if (!db) return null;
  await ensureEmailTables(db);
  const rows = await db.select().from(emailLogs).where(eq(emailLogs.id, logId)).limit(1);
  return rows[0] ?? null;
}

export async function getCampaignEmailLogs(campaignId: string): Promise<EmailLog[]> {
  const db = await getDb();
  if (!db) return [];
  await ensureEmailTables(db);
  return db.select().from(emailLogs).where(eq(emailLogs.campaignId, campaignId)).orderBy(desc(emailLogs.sentAt));
}

export async function getTransactionalEmailLogs(limit: number = 200): Promise<EmailLog[]> {
  const db = await getDb();
  if (!db) return [];
  await ensureEmailTables(db);
  return db.select().from(emailLogs)
    .where(or(
      like(emailLogs.campaignId, "order-%"),
      like(emailLogs.campaignId, "shipping-%"),
      eq(emailLogs.campaignId, "otp"),
      eq(emailLogs.campaignId, "welcome"),
    ))
    .orderBy(desc(emailLogs.sentAt))
    .limit(limit);
}

export async function getCampaignEmailStats(campaignId: string) {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0, opened: 0, clicked: 0, total: 0 };
  await ensureEmailTables(db);
  const logs = await db.select().from(emailLogs).where(eq(emailLogs.campaignId, campaignId));
  return {
    total: logs.length,
    sent: logs.filter(l => l.status === "sent").length,
    failed: logs.filter(l => l.status === "failed").length,
    opened: logs.filter(l => l.openCount > 0).length,
    clicked: logs.filter(l => l.clickCount > 0).length,
  };
}

export async function addEmailUnsubscribe(email: string, reason?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await ensureEmailTables(db);
  try {
    await db.insert(emailUnsubscribes).values({ email: email.toLowerCase(), reason: reason || null });
  } catch { /* duplicate — already unsubscribed */ }
}

export async function isEmailUnsubscribed(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await ensureEmailTables(db);
  const rows = await db.select().from(emailUnsubscribes).where(eq(emailUnsubscribes.email, email.toLowerCase())).limit(1);
  return rows.length > 0;
}

export async function getUnsubscribedEmails(): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();
  await ensureEmailTables(db);
  const rows = await db.select({ email: emailUnsubscribes.email }).from(emailUnsubscribes);
  return new Set(rows.map(r => r.email.toLowerCase()));
}

export async function removeEmailUnsubscribe(email: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await ensureEmailTables(db);
  await db.delete(emailUnsubscribes).where(eq(emailUnsubscribes.email, email.toLowerCase()));
}

// ─── CEO Revenue Dashboard ───────────────────────────────────────────────────

export async function getCEODashboard() {
  const db = await getDb();
  const empty = {
    todayRevenue: 0, todayOrders: 0,
    mtdRevenue: 0, mtdOrders: 0,
    pendingCODAmount: 0, collectedCODAmount: 0,
    top5Products: [] as { name: string; revenue: number; quantity: number }[],
    revenueByPaymentMethod: [] as { method: string; revenue: number; orders: number }[],
    dailyRevenueTrend: [] as { date: string; revenue: number; orderCount: number }[],
    newCustomers: 0, repeatCustomers: 0,
  };
  if (!db) return empty;

  const now = new Date();
  // Use IST (UTC+5:30) for "today" boundary so it matches what the owner sees
  const istOffset = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(now.getTime() + istOffset);
  const todayStartIST = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()));
  const todayStartUTC = new Date(todayStartIST.getTime() - istOffset);
  const mtdStartIST = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), 1));
  const mtdStartUTC = new Date(mtdStartIST.getTime() - istOffset);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  // Fetch non-cancelled orders from last 30 days (covers today + MTD + trend)
  const recentOrders = await db.select({
    total: orders.total,
    status: orders.status,
    paymentMethod: orders.paymentMethod,
    phone: orders.phone,
    items: orders.items,
    createdAt: orders.createdAt,
  }).from(orders)
    .where(and(
      gte(orders.createdAt, thirtyDaysAgo),
      ne(orders.status, "cancelled"),
    ));

  // Also fetch COD orders specifically (pending COD can be older than 30d)
  const codPendingRows = await db.select({
    total: orders.total,
    status: orders.status,
  }).from(orders)
    .where(and(
      eq(orders.paymentMethod, "COD"),
      ne(orders.status, "cancelled"),
    ));

  // Today + MTD
  let todayRevenue = 0, todayOrders = 0, mtdRevenue = 0, mtdOrders = 0;
  for (const o of recentOrders) {
    const t = new Date(o.createdAt).getTime();
    if (t >= mtdStartUTC.getTime()) {
      mtdRevenue += o.total;
      mtdOrders++;
    }
    if (t >= todayStartUTC.getTime()) {
      todayRevenue += o.total;
      todayOrders++;
    }
  }

  // Pending COD = COD orders not yet delivered or cancelled
  let pendingCODAmount = 0, collectedCODAmount = 0;
  for (const o of codPendingRows) {
    if (o.status === "delivered") {
      collectedCODAmount += o.total;
    } else {
      pendingCODAmount += o.total;
    }
  }

  // Top 5 products by revenue (from MTD orders)
  const productMap: Record<string, { name: string; revenue: number; quantity: number }> = {};
  for (const o of recentOrders) {
    const t = new Date(o.createdAt).getTime();
    if (t < mtdStartUTC.getTime()) continue;
    const items = (o.items as any[]) ?? [];
    for (const item of items) {
      const key = item.name || "Unknown";
      if (!productMap[key]) productMap[key] = { name: key, revenue: 0, quantity: 0 };
      productMap[key].revenue += (item.price ?? 0) * (item.quantity ?? 1);
      productMap[key].quantity += item.quantity ?? 1;
    }
  }
  const top5Products = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Revenue by payment method (MTD)
  const methodMap: Record<string, { revenue: number; orders: number }> = {};
  for (const o of recentOrders) {
    const t = new Date(o.createdAt).getTime();
    if (t < mtdStartUTC.getTime()) continue;
    const m = o.paymentMethod || "Other";
    if (!methodMap[m]) methodMap[m] = { revenue: 0, orders: 0 };
    methodMap[m].revenue += o.total;
    methodMap[m].orders++;
  }
  const revenueByPaymentMethod = Object.entries(methodMap).map(([method, d]) => ({ method, ...d }));

  // Daily revenue trend (last 30 days)
  const dayBuckets: Record<string, { revenue: number; orderCount: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000 + istOffset);
    const label = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    dayBuckets[label] = { revenue: 0, orderCount: 0 };
  }
  for (const o of recentOrders) {
    const d = new Date(new Date(o.createdAt).getTime() + istOffset);
    const label = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    if (dayBuckets[label]) {
      dayBuckets[label].revenue += o.total;
      dayBuckets[label].orderCount++;
    }
  }
  const dailyRevenueTrend = Object.entries(dayBuckets).map(([date, d]) => ({ date, ...d }));

  // New vs repeat customers (MTD, by phone)
  const mtdPhones: Record<string, number> = {};
  for (const o of recentOrders) {
    const t = new Date(o.createdAt).getTime();
    if (t < mtdStartUTC.getTime()) continue;
    if (o.phone) mtdPhones[o.phone] = (mtdPhones[o.phone] || 0) + 1;
  }
  // To know if someone is "new" we check if they had any order before MTD start
  const allPhones = Object.keys(mtdPhones);
  const priorPhones = new Set<string>();
  if (allPhones.length > 0) {
    const priorRows = await db.select({ phone: orders.phone })
      .from(orders)
      .where(and(
        lt(orders.createdAt, mtdStartUTC),
        ne(orders.status, "cancelled"),
        inArray(orders.phone, allPhones),
      ));
    for (const r of priorRows) {
      if (r.phone) priorPhones.add(r.phone);
    }
  }
  let newCustomers = 0, repeatCustomers = 0;
  for (const phone of allPhones) {
    if (priorPhones.has(phone)) repeatCustomers++;
    else newCustomers++;
  }

  return {
    todayRevenue, todayOrders,
    mtdRevenue, mtdOrders,
    pendingCODAmount, collectedCODAmount,
    top5Products,
    revenueByPaymentMethod,
    dailyRevenueTrend,
    newCustomers, repeatCustomers,
  };
}


// ─── Admin Users ──────────────────────────────────────────────────────────────

export async function getAdminUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.email, email.toLowerCase())).limit(1);
  return rows[0] ?? null;
}

export async function updateAdminUserPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminUsers)
    .set({ passwordHash, resetToken: null, resetTokenExp: null })
    .where(eq(adminUsers.id, id));
}

export async function setAdminResetToken(id: number, token: string, expiry: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminUsers)
    .set({ resetToken: token, resetTokenExp: expiry })
    .where(eq(adminUsers.id, id));
}

export async function updateAdminLastLogin(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(adminUsers.id, id));
}

// ─── Admin Users management (Users admin page) ─────────────────────────────────
// The login side (email+password, reset) already exists above. These functions
// back the Users page that lists admin accounts and assigns roles.

type AdminRole = "owner" | "admin" | "manager";

// Seed admin accounts so email login is usable out of the box.
// SECURITY: passwords are NEVER hardcoded in source. Accounts are seeded only
// when a password is supplied via environment variables:
//   - owner account  ← ADMIN_PASSWORD
//   - default admin  ← DEFAULT_ADMIN_PASSWORD (optional)
// If the env var is absent, the account is simply not seeded (the owner can
// create admins from the panel). This prevents a committed credential from
// becoming a live login. See qa-audit/SECURITY_AUDIT.md (NW-SEC-01).
const SEED_ADMIN_EMAIL = "amith@foodondoor.com";
const DEFAULT_ADMIN_EMAIL = "orders@foodondoor.com";

async function ensureSeedAdminUser(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { hashUserPassword, getAdminPassword } = await import("./_core/adminSession");

  // Original owner account — seeded only when ADMIN_PASSWORD is configured.
  const ownerPassword = getAdminPassword();
  const existing = await db.select().from(adminUsers).where(eq(adminUsers.email, SEED_ADMIN_EMAIL)).limit(1);
  if (existing.length === 0) {
    if (ownerPassword) {
      await db.insert(adminUsers).values({
        email: SEED_ADMIN_EMAIL,
        name: "Amith",
        passwordHash: hashUserPassword(ownerPassword),
        role: "owner",
      });
    } else {
      console.warn("[SEED] Owner admin not created — set ADMIN_PASSWORD to seed the owner account.");
    }
  }

  // Default admin account — seeded only from DEFAULT_ADMIN_PASSWORD env (never a
  // hardcoded value). Absent env → account is not created.
  const seedDefaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "";
  const defaultAdmin = await db.select().from(adminUsers).where(eq(adminUsers.email, DEFAULT_ADMIN_EMAIL)).limit(1);
  if (defaultAdmin.length === 0 && seedDefaultPassword) {
    await db.insert(adminUsers).values({
      email: DEFAULT_ADMIN_EMAIL,
      name: "Orders",
      passwordHash: hashUserPassword(seedDefaultPassword),
      role: "admin",
    });
    console.log("[SEED] Default admin account created from DEFAULT_ADMIN_PASSWORD env. Change it after first login.");
  }
}

export async function getAllAdminUsers() {
  const db = await getDb();
  if (!db) return [];
  await ensureSeedAdminUser();
  return db.select().from(adminUsers).orderBy(adminUsers.createdAt);
}

export async function createAdminUser(data: {
  email: string;
  name?: string;
  mobile?: string;
  passwordHash: string;
  role?: AdminRole;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const email = data.email.trim().toLowerCase();
  const existing = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (existing.length > 0) throw new Error("An admin with this email already exists.");
  await db.insert(adminUsers).values({
    email,
    name: data.name?.trim() || email.split("@")[0],
    mobile: data.mobile?.replace(/[^0-9]/g, "").slice(-10) || null,
    passwordHash: data.passwordHash,
    role: data.role ?? "admin",
  });
  const created = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  return created[0] ?? null;
}

export async function updateAdminUserRole(id: number, role: AdminRole) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(adminUsers).set({ role }).where(eq(adminUsers.id, id));
  const updated = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return updated[0] ?? null;
}

export async function deleteAdminUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(adminUsers).where(eq(adminUsers.id, id));
  return { success: true };
}

// ─── Wishlists (self-creating table) ─────────────────────────────────────────
let _wishlistsReady = false;
const CREATE_WISHLISTS = "CREATE TABLE IF NOT EXISTS `wishlists` (" +
  "`id` int AUTO_INCREMENT NOT NULL," +
  "`customerId` int NOT NULL," +
  "`productId` int NOT NULL," +
  "`createdAt` timestamp NOT NULL DEFAULT (now())," +
  "INDEX `wishlists_customer_product_idx` (`customerId`, `productId`)," +
  "CONSTRAINT `wishlists_id` PRIMARY KEY(`id`))";

async function ensureWishlistTable(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  if (_wishlistsReady) return;
  try { await db.execute(sql.raw(CREATE_WISHLISTS)); _wishlistsReady = true; }
  catch (e) { console.error("[Wishlist] ensure table failed:", e); }
}

export async function getWishlistByCustomer(customerId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  await ensureWishlistTable(db);
  const rows = await db.select({ productId: wishlists.productId })
    .from(wishlists)
    .where(eq(wishlists.customerId, customerId))
    .orderBy(desc(wishlists.createdAt));
  return rows.map(r => r.productId);
}

export async function addToWishlist(customerId: number, productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureWishlistTable(db);
  // INSERT IGNORE to avoid duplicates
  await db.execute(
    sql`INSERT IGNORE INTO wishlists (customerId, productId) VALUES (${customerId}, ${productId})`
  );
}

export async function removeFromWishlist(customerId: number, productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureWishlistTable(db);
  await db.delete(wishlists).where(
    and(eq(wishlists.customerId, customerId), eq(wishlists.productId, productId))
  );
}

export async function isInWishlist(customerId: number, productId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await ensureWishlistTable(db);
  const rows = await db.select({ id: wishlists.id })
    .from(wishlists)
    .where(and(eq(wishlists.customerId, customerId), eq(wishlists.productId, productId)))
    .limit(1);
  return rows.length > 0;
}

export async function bulkAddToWishlist(customerId: number, productIds: number[]) {
  if (productIds.length === 0) return;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureWishlistTable(db);
  for (const productId of productIds) {
    await db.execute(
      sql`INSERT IGNORE INTO wishlists (customerId, productId) VALUES (${customerId}, ${productId})`
    );
  }
}

// ─── Referrals ────────────────────────────────────────────────────────────────

let _referralsReady = false;
const CREATE_REFERRALS = "CREATE TABLE IF NOT EXISTS `referrals` (" +
  "`id` int AUTO_INCREMENT NOT NULL," +
  "`referrerCustomerId` int NOT NULL," +
  "`referralCode` varchar(20) NOT NULL," +
  "`referredCustomerId` int," +
  "`status` varchar(20) NOT NULL DEFAULT 'pending'," +
  "`createdAt` timestamp NOT NULL DEFAULT (now())," +
  "`completedAt` timestamp NULL," +
  "CONSTRAINT `referrals_id` PRIMARY KEY(`id`)," +
  "CONSTRAINT `referrals_referralCode_unique` UNIQUE(`referralCode`)," +
  "INDEX `referrals_referrerCustomerId_idx` (`referrerCustomerId`))";

async function ensureReferralsTable(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  if (_referralsReady) return;
  try { await db.execute(sql.raw(CREATE_REFERRALS)); _referralsReady = true; }
  catch (e) { console.error("[Referral] ensure table failed:", e); }
}

/** Generate a unique referral code like "NUTRI-A1B2" for a customer */
export async function generateReferralCode(customerId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureReferralsTable(db);

  // Check if customer already has a code
  const existing = await db.select().from(referrals)
    .where(and(eq(referrals.referrerCustomerId, customerId), eq(referrals.referredCustomerId, 0)))
    .limit(1);
  // Look for a "master" row — one with no referred customer (the referrer's own code row)
  const masterRow = await db.select().from(referrals)
    .where(eq(referrals.referrerCustomerId, customerId))
    .limit(1);
  if (masterRow.length > 0) return masterRow[0].referralCode;

  // Generate unique code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    code = `NUTRI-${suffix}`;
    // Check uniqueness
    const dup = await db.select().from(referrals).where(eq(referrals.referralCode, code)).limit(1);
    if (dup.length === 0) break;
  }

  // Insert a master row (referredCustomerId = null, status = pending)
  await db.insert(referrals).values({
    referrerCustomerId: customerId,
    referralCode: code,
    referredCustomerId: null,
    status: "pending",
  });

  return code;
}

/** Get existing referral code for a customer, or generate one */
export async function getReferralCode(customerId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureReferralsTable(db);

  const rows = await db.select().from(referrals)
    .where(eq(referrals.referrerCustomerId, customerId))
    .limit(1);
  if (rows.length > 0) return rows[0].referralCode;

  return generateReferralCode(customerId);
}

/** Validate that a referral code exists and return the referrer's customer ID */
export async function validateReferralCode(code: string): Promise<{ valid: boolean; referrerCustomerId?: number }> {
  const db = await getDb();
  if (!db) return { valid: false };
  await ensureReferralsTable(db);

  const rows = await db.select().from(referrals)
    .where(eq(referrals.referralCode, code.toUpperCase()))
    .limit(1);
  if (rows.length === 0) return { valid: false };
  return { valid: true, referrerCustomerId: rows[0].referrerCustomerId };
}

/** Apply a referral: mark as completed and create a reward coupon for the referrer */
export async function applyReferral(code: string, newCustomerId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await ensureReferralsTable(db);

  const codeUpper = code.toUpperCase();

  // Find the master row for this code
  const rows = await db.select().from(referrals)
    .where(eq(referrals.referralCode, codeUpper))
    .limit(1);
  if (rows.length === 0) return false;

  const referrerCustomerId = rows[0].referrerCustomerId;

  // Don't let someone refer themselves
  if (referrerCustomerId === newCustomerId) return false;

  // Check if this new customer was already referred
  const alreadyReferred = await db.select().from(referrals)
    .where(eq(referrals.referredCustomerId, newCustomerId))
    .limit(1);
  if (alreadyReferred.length > 0) return false;

  // Insert a new referral row tracking this specific completion
  await db.insert(referrals).values({
    referrerCustomerId,
    referralCode: codeUpper,
    referredCustomerId: newCustomerId,
    status: "completed",
    completedAt: new Date(),
  }).onDuplicateKeyUpdate({ set: { status: "completed" } }); // code is unique, so first insert may conflict with master row; use a different approach

  // Actually, the master row already has the unique code. We need to track completions differently.
  // Insert a completion record with a derived unique code suffix
  const completionCode = `${codeUpper}-${newCustomerId}`;
  try {
    await db.insert(referrals).values({
      referrerCustomerId,
      referralCode: completionCode,
      referredCustomerId: newCustomerId,
      status: "completed",
      completedAt: new Date(),
    });
  } catch (e) {
    // Already exists (duplicate referral) — ignore
    return false;
  }

  // Create a reward coupon for the referrer: REF50-{customerId}
  const couponCode = `REF50-${referrerCustomerId}`;
  try {
    const existingCoupon = await db.select().from(coupons)
      .where(eq(coupons.code, couponCode)).limit(1);
    if (existingCoupon.length === 0) {
      // Create new coupon — exactly ONE ₹50 use per successful referral.
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 3); // valid for 3 months
      await db.insert(coupons).values({
        code: couponCode,
        description: `Referral reward: ₹50 off for referring a friend`,
        discountType: "flat",
        discountValue: 50,
        minOrderAmount: 200,
        maxUses: 1, // one use per referral (repeat referrers get +1 below — never unlimited)
        isActive: true,
        expiresAt,
      });
    } else {
      // Each additional successful referral grants ONE more use (never unlimited).
      // Floor at usedCount+1 so a repeat referral always yields a usable reward even
      // if a legacy maxUses:0 coupon had already been used.
      const prev = existingCoupon[0];
      const nextMaxUses = Math.max((prev.maxUses || 0) + 1, (prev.usedCount || 0) + 1);
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 3);
      await db.update(coupons)
        .set({ isActive: true, expiresAt, maxUses: nextMaxUses })
        .where(eq(coupons.code, couponCode));
    }
  } catch (e) {
    console.error("[Referral] coupon creation failed:", e);
  }

  // Update the completion row to "rewarded"
  try {
    await db.update(referrals)
      .set({ status: "rewarded" })
      .where(eq(referrals.referralCode, completionCode));
  } catch { /* best effort */ }

  return true;
}

/** Get referral stats for a customer */
export async function getReferralStats(customerId: number): Promise<{
  totalReferrals: number;
  completed: number;
  rewardsEarned: number;
}> {
  const db = await getDb();
  if (!db) return { totalReferrals: 0, completed: 0, rewardsEarned: 0 };
  await ensureReferralsTable(db);

  const rows = await db.select().from(referrals)
    .where(eq(referrals.referrerCustomerId, customerId));

  // Exclude the master row (referredCustomerId is null)
  const completions = rows.filter(r => r.referredCustomerId !== null);
  const rewarded = completions.filter(r => r.status === "rewarded").length;

  return {
    totalReferrals: completions.length,
    completed: completions.filter(r => r.status === "completed" || r.status === "rewarded").length,
    rewardsEarned: rewarded * 50, // ₹50 per referral
  };
}

// ─── Loyalty Points (self-creating table) ────────────────────────────────────

// Earning rules (hardcoded)
export const LOYALTY_RULES = {
  POINTS_PER_RUPEE: 1,        // ₹1 spent = 1 point (prices in paise → divide by 100)
  SIGNUP_BONUS: 50,
  REVIEW_BONUS: 20,
  REFERRAL_BONUS: 100,
  POINTS_PER_DISCOUNT: 10,    // 100 points = ₹10 → 10 points = ₹1
  MIN_REDEMPTION: 100,        // minimum points to redeem
  MAX_REDEMPTION_PER_ORDER: 500, // max points per order (₹50)
} as const;

let _loyaltyTableReady = false;
const CREATE_LOYALTY_TABLE = "CREATE TABLE IF NOT EXISTS `loyaltyPoints` (" +
  "`id` int AUTO_INCREMENT NOT NULL," +
  "`customerId` int NOT NULL," +
  "`points` int NOT NULL," +
  "`type` varchar(30) NOT NULL," +
  "`description` varchar(200)," +
  "`orderId` varchar(50)," +
  "`createdAt` timestamp NOT NULL DEFAULT (now())," +
  "CONSTRAINT `loyaltyPoints_id` PRIMARY KEY(`id`)," +
  "INDEX `loyalty_customer_idx` (`customerId`))";

async function ensureLoyaltyTable(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  if (_loyaltyTableReady) return;
  try { await db.execute(sql.raw(CREATE_LOYALTY_TABLE)); _loyaltyTableReady = true; }
  catch (e) { console.error("[Loyalty] ensureLoyaltyTable failed:", e); }
}

/** Sum earned+bonus minus redeemed to get current balance. */
export async function getPointsBalance(customerId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  await ensureLoyaltyTable(db);
  const rows = await db.select({
    earned: sql<number>`COALESCE(SUM(CASE WHEN ${loyaltyPoints.type} IN ('earned','bonus') THEN ${loyaltyPoints.points} ELSE 0 END), 0)`,
    redeemed: sql<number>`COALESCE(SUM(CASE WHEN ${loyaltyPoints.type} = 'redeemed' THEN ${loyaltyPoints.points} ELSE 0 END), 0)`,
  }).from(loyaltyPoints).where(eq(loyaltyPoints.customerId, customerId));
  const { earned, redeemed } = rows[0] ?? { earned: 0, redeemed: 0 };
  return Math.max(0, Number(earned) - Math.abs(Number(redeemed)));
}

/** Insert a loyalty points record. */
export async function addLoyaltyPoints(
  customerId: number,
  points: number,
  type: "earned" | "redeemed" | "expired" | "bonus",
  description: string,
  orderId?: string,
) {
  const db = await getDb();
  if (!db) return;
  await ensureLoyaltyTable(db);
  await db.insert(loyaltyPoints).values({
    customerId,
    points: type === "redeemed" ? -Math.abs(points) : Math.abs(points),
    type,
    description,
    orderId: orderId || null,
  });
}

/** Give back any loyalty points redeemed on an order (called when the order is
 *  cancelled). Idempotent: skips if a refund entry for this order already exists. */
export async function refundRedeemedPoints(orderId: string): Promise<void> {
  const db = await getDb();
  if (!db || !orderId) return;
  await ensureLoyaltyTable(db);
  // Already refunded? (bonus entry tagged for this order)
  const existing = await db.select({ id: loyaltyPoints.id }).from(loyaltyPoints)
    .where(and(eq(loyaltyPoints.orderId, orderId), eq(loyaltyPoints.type, "bonus"), like(loyaltyPoints.description, "Refund for cancelled%")))
    .limit(1);
  if (existing.length > 0) return;
  // Sum points redeemed on this order (stored negative), per customer.
  const rows = await db.select({
    customerId: loyaltyPoints.customerId,
    pts: sql<number>`COALESCE(SUM(${loyaltyPoints.points}), 0)`,
  }).from(loyaltyPoints)
    .where(and(eq(loyaltyPoints.orderId, orderId), eq(loyaltyPoints.type, "redeemed")))
    .groupBy(loyaltyPoints.customerId);
  for (const r of rows) {
    const redeemed = Number(r.pts); // negative
    if (redeemed < 0) {
      await db.insert(loyaltyPoints).values({
        customerId: r.customerId,
        points: Math.abs(redeemed),
        type: "bonus",
        description: `Refund for cancelled order #${orderId}`,
        orderId,
      });
    }
  }
}

/** Last 20 transactions for a customer. */
export async function getPointsHistory(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  await ensureLoyaltyTable(db);
  return db.select().from(loyaltyPoints)
    .where(eq(loyaltyPoints.customerId, customerId))
    .orderBy(desc(loyaltyPoints.createdAt))
    .limit(20);
}

// ─── Cart Funnel Events ──────────────────────────────────────────────────────

export async function logCartEvent(data: {
  sessionId: string;
  customerId?: number | null;
  event: string;
  productId?: number | null;
  cartValue?: number;
}) {
  const db = await getDb();
  if (!db) return null;
  try {
    await db.insert(cartEvents).values({
      sessionId: data.sessionId,
      customerId: data.customerId ?? null,
      event: data.event,
      productId: data.productId ?? null,
      cartValue: data.cartValue ?? 0,
    });
    return { success: true };
  } catch (e) {
    console.warn("[Database] logCartEvent error:", e);
    return null;
  }
}

const FUNNEL_STEPS = [
  'add_to_cart',
  'view_cart',
  'start_checkout',
  'enter_address',
  'select_payment',
  'order_placed',
] as const;

export async function getCartFunnelStats(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return FUNNEL_STEPS.map(step => ({ step, sessions: 0 }));

  const results = await db.select({
    event: cartEvents.event,
    sessions: sql<number>`COUNT(DISTINCT ${cartEvents.sessionId})`,
  })
    .from(cartEvents)
    .where(and(
      gte(cartEvents.createdAt, startDate),
      sql`${cartEvents.createdAt} <= ${endDate}`,
    ))
    .groupBy(cartEvents.event);

  const eventMap: Record<string, number> = {};
  for (const r of results) {
    eventMap[r.event] = r.sessions;
  }

  return FUNNEL_STEPS.map(step => ({
    step,
    sessions: eventMap[step] || 0,
  }));
}

export async function getAbandonedCartSessions(limit = 50) {
  const db = await getDb();
  if (!db) return [];

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Sessions that had add_to_cart but no order_placed in last 7 days
  const rows = await db.execute(sql`
    SELECT
      ce.sessionId,
      ce.customerId,
      MAX(ce.cartValue) as cartValue,
      MAX(ce.event) as lastEvent,
      MAX(ce.createdAt) as lastActivity,
      cp.phone as customerPhone,
      cp.name as customerName
    FROM cartEvents ce
    LEFT JOIN customerProfiles cp ON ce.customerId = cp.id
    WHERE ce.createdAt >= ${sevenDaysAgo}
      AND ce.sessionId NOT IN (
        SELECT DISTINCT sessionId FROM cartEvents
        WHERE event = 'order_placed' AND createdAt >= ${sevenDaysAgo}
      )
      AND ce.event = 'add_to_cart'
    GROUP BY ce.sessionId, ce.customerId, cp.phone, cp.name
    ORDER BY lastActivity DESC
    LIMIT ${limit}
  `);

  // mysql2 returns [rows, fields]
  const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
  return (data as any[]).map(r => ({
    sessionId: r.sessionId as string,
    customerId: r.customerId as number | null,
    cartValue: r.cartValue as number,
    lastEvent: r.lastEvent as string,
    lastActivity: r.lastActivity as string,
    customerPhone: r.customerPhone as string | null,
    customerName: r.customerName as string | null,
  }));
}

// ─── Subscriptions (Subscribe & Save) ────────────────────────────────────────

export async function createSubscription(
  userId: number,
  productId: number,
  variantIdx: number,
  quantity: number,
  frequencyDays: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const nextDeliveryDate = new Date();
  nextDeliveryDate.setDate(nextDeliveryDate.getDate() + frequencyDays);
  const nextDateStr = nextDeliveryDate.toISOString().slice(0, 10);
  await db.execute(
    sql`INSERT INTO subscriptions (userId, productId, variantIdx, quantity, frequencyDays, discountPercent, status, nextDeliveryDate)
        VALUES (${userId}, ${productId}, ${variantIdx}, ${quantity}, ${frequencyDays}, 10, 'active', ${nextDateStr})`
  );
  const rows = await db.execute(
    sql`SELECT s.*, p.name AS productName, p.price AS productPrice, p.weight AS productWeight,
        (SELECT pi.url FROM productImages pi WHERE pi.productId = s.productId AND pi.isHero = 1 LIMIT 1) AS productImage
        FROM subscriptions s
        JOIN products p ON p.id = s.productId
        WHERE s.userId = ${userId}
        ORDER BY s.id DESC LIMIT 1`
  );
  return (rows as any)[0]?.[0] ?? null;
}

export async function getUserSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.execute(
    sql`SELECT s.*, p.name AS productName, p.price AS productPrice, p.weight AS productWeight,
        p.handle AS productHandle,
        (SELECT pi.url FROM productImages pi WHERE pi.productId = s.productId AND pi.isHero = 1 LIMIT 1) AS productImage
        FROM subscriptions s
        JOIN products p ON p.id = s.productId
        WHERE s.userId = ${userId}
        ORDER BY s.createdAt DESC`
  );
  return (rows as any)[0] ?? [];
}

export async function getSubscriptionById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.execute(
    sql`SELECT s.*, p.name AS productName, p.price AS productPrice, p.weight AS productWeight,
        (SELECT pi.url FROM productImages pi WHERE pi.productId = s.productId AND pi.isHero = 1 LIMIT 1) AS productImage
        FROM subscriptions s
        JOIN products p ON p.id = s.productId
        WHERE s.id = ${id} AND s.userId = ${userId}
        LIMIT 1`
  );
  const row = (rows as any)[0]?.[0];
  return row ?? null;
}

export async function updateSubscription(
  id: number,
  userId: number,
  updates: { status?: string; frequencyDays?: number; quantity?: number },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const setClauses: string[] = [];
  if (updates.status) setClauses.push(`status = '${updates.status}'`);
  if (updates.frequencyDays) {
    setClauses.push(`frequencyDays = ${updates.frequencyDays}`);
    const next = new Date();
    next.setDate(next.getDate() + updates.frequencyDays);
    setClauses.push(`nextDeliveryDate = '${next.toISOString().slice(0, 10)}'`);
  }
  if (updates.quantity) setClauses.push(`quantity = ${updates.quantity}`);
  if (setClauses.length === 0) return getSubscriptionById(id, userId);

  await db.execute(
    sql.raw(`UPDATE subscriptions SET ${setClauses.join(", ")} WHERE id = ${id} AND userId = ${userId}`)
  );
  return getSubscriptionById(id, userId);
}

export async function getAdminSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.execute(
    sql`SELECT s.*, p.name AS productName, p.price AS productPrice, p.weight AS productWeight,
        cp.name AS customerName, cp.phone AS customerPhone,
        (SELECT pi.url FROM productImages pi WHERE pi.productId = s.productId AND pi.isHero = 1 LIMIT 1) AS productImage
        FROM subscriptions s
        JOIN products p ON p.id = s.productId
        LEFT JOIN customerProfiles cp ON cp.id = s.userId
        ORDER BY s.createdAt DESC`
  );
  return (rows as any)[0] ?? [];
}

// ─── Customer Segmentation ──────────────────────────────────────────────────

export type CustomerSegment = "New" | "First-Timer" | "Active" | "VIP" | "At-Risk" | "Dormant" | "Churned";

export interface SegmentedCustomer {
  phone: string;
  name: string;
  email: string | null;
  segment: CustomerSegment;
  orderCount: number;
  totalSpend: number;
  lastOrderDate: string | null;
  firstOrderDate: string | null;
  daysSinceLastOrder: number | null;
}

export async function getCustomerSegments(): Promise<SegmentedCustomer[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.execute(sql`
    SELECT
      cp.phone,
      cp.name,
      cp.email,
      COALESCE(o.order_count, 0) AS order_count,
      COALESCE(o.total_spend, 0) AS total_spend,
      o.last_order_date,
      o.first_order_date,
      CASE
        WHEN o.order_count IS NULL OR o.order_count = 0 THEN 'New'
        WHEN o.last_order_date IS NOT NULL AND DATEDIFF(NOW(), o.last_order_date) > 180 THEN 'Churned'
        WHEN o.last_order_date IS NOT NULL AND DATEDIFF(NOW(), o.last_order_date) > 120 THEN 'Dormant'
        WHEN o.order_count >= 5 OR o.total_spend > 500000 THEN 'VIP'
        WHEN o.order_count >= 2 AND DATEDIFF(NOW(), o.last_order_date) > 60 THEN 'At-Risk'
        WHEN o.order_count >= 2 AND DATEDIFF(NOW(), o.last_order_date) <= 60 THEN 'Active'
        WHEN o.order_count = 1 AND DATEDIFF(NOW(), o.first_order_date) <= 30 THEN 'First-Timer'
        ELSE 'New'
      END AS segment,
      CASE
        WHEN o.last_order_date IS NOT NULL THEN DATEDIFF(NOW(), o.last_order_date)
        ELSE NULL
      END AS days_since_last_order
    FROM customerProfiles cp
    LEFT JOIN (
      SELECT
        phone,
        COUNT(*) AS order_count,
        SUM(CASE WHEN status <> 'cancelled' THEN total ELSE 0 END) AS total_spend,
        MAX(createdAt) AS last_order_date,
        MIN(createdAt) AS first_order_date
      FROM orders
      GROUP BY phone
    ) o ON cp.phone = o.phone
    ORDER BY COALESCE(o.total_spend, 0) DESC
  `);

  const data = (Array.isArray(rows) && Array.isArray(rows[0])) ? rows[0] : rows;
  return (data as any[]).map((r: any) => ({
    phone: r.phone,
    name: r.name || "—",
    email: r.email || null,
    segment: r.segment as CustomerSegment,
    orderCount: Number(r.order_count) || 0,
    totalSpend: Number(r.total_spend) || 0,
    lastOrderDate: r.last_order_date ? new Date(r.last_order_date).toISOString() : null,
    firstOrderDate: r.first_order_date ? new Date(r.first_order_date).toISOString() : null,
    daysSinceLastOrder: r.days_since_last_order != null ? Number(r.days_since_last_order) : null,
  }));
}

export async function getSegmentSummary() {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.execute(sql`
    SELECT
      seg.segment,
      COUNT(*) AS customer_count,
      SUM(seg.total_spend) AS total_revenue
    FROM (
      SELECT
        cp.phone,
        COALESCE(o.order_count, 0) AS order_count,
        COALESCE(o.total_spend, 0) AS total_spend,
        o.last_order_date,
        o.first_order_date,
        CASE
          WHEN o.order_count IS NULL OR o.order_count = 0 THEN 'New'
          WHEN o.last_order_date IS NOT NULL AND DATEDIFF(NOW(), o.last_order_date) > 180 THEN 'Churned'
          WHEN o.last_order_date IS NOT NULL AND DATEDIFF(NOW(), o.last_order_date) > 120 THEN 'Dormant'
          WHEN o.order_count >= 5 OR o.total_spend > 500000 THEN 'VIP'
          WHEN o.order_count >= 2 AND DATEDIFF(NOW(), o.last_order_date) > 60 THEN 'At-Risk'
          WHEN o.order_count >= 2 AND DATEDIFF(NOW(), o.last_order_date) <= 60 THEN 'Active'
          WHEN o.order_count = 1 AND DATEDIFF(NOW(), o.first_order_date) <= 30 THEN 'First-Timer'
          ELSE 'New'
        END AS segment
      FROM customerProfiles cp
      LEFT JOIN (
        SELECT
          phone,
          COUNT(*) AS order_count,
          SUM(CASE WHEN status <> 'cancelled' THEN total ELSE 0 END) AS total_spend,
          MAX(createdAt) AS last_order_date,
          MIN(createdAt) AS first_order_date
        FROM orders
        GROUP BY phone
      ) o ON cp.phone = o.phone
    ) seg
    GROUP BY seg.segment
    ORDER BY total_revenue DESC
  `);

  const data = (Array.isArray(rows) && Array.isArray(rows[0])) ? rows[0] : rows;
  return (data as any[]).map((r: any) => ({
    segment: r.segment as CustomerSegment,
    count: Number(r.customer_count) || 0,
    totalRevenue: Number(r.total_revenue) || 0,
  }));
}
