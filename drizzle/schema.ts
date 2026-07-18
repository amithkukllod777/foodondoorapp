import { boolean, index, int, json, longtext, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing Manus OAuth auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Customer profiles — OTP-based login (phone is the primary identifier).
 */
export const customerProfiles = mysqlTable("customerProfiles", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 15 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type InsertCustomerProfile = typeof customerProfiles.$inferInsert;

/**
 * Delivery addresses saved by customers.
 */
export const addresses = mysqlTable("addresses", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 15 }).notNull(),
  flat: text("flat").notNull(),
  area: text("area"),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull().default(""),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  customerIdx: index("addresses_customerId_idx").on(t.customerId),
}));
export type Address = typeof addresses.$inferSelect;
export type InsertAddress = typeof addresses.$inferInsert;

export const wishlists = mysqlTable("wishlists", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  productId: int("productId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  customerProductIdx: index("wishlists_customer_product_idx").on(t.customerId, t.productId),
}));
export type Wishlist = typeof wishlists.$inferSelect;
export type InsertWishlist = typeof wishlists.$inferInsert;

/**
 * Orders placed by customers.
 */
export const orders = mysqlTable("orders", {
  id: varchar("id", { length: 20 }).primaryKey(),
  customerId: int("customerId").notNull().default(0),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 15 }).notNull(),
  email: varchar("email", { length: 320 }).default(""),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull().default(""),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  items: json("items").notNull(),
  subtotal: int("subtotal").notNull(),
  couponCode: varchar("couponCode", { length: 50 }),
  couponDiscount: int("couponDiscount").default(0).notNull(),
  total: int("total").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["COD", "UPI", "Card", "Advance", "PhonePe", "Razorpay"]).notNull(),
  paymentPlan: mysqlEnum("paymentPlan", ["full", "advance30", "cod", "phonepe_full", "phonepe_advance30", "razorpay_full", "razorpay_advance30"]).default("cod").notNull(),
  amountPaid: int("amountPaid").default(0).notNull(),
  paymentId: varchar("paymentId", { length: 120 }), // gateway payment id (Razorpay payment_id) — needed to issue refunds
  refundedAmount: int("refundedAmount").default(0).notNull(), // rupees refunded so far
  refundStatus: mysqlEnum("refundStatus", ["none", "partial", "full", "failed"]).default("none").notNull(),
  status: mysqlEnum("status", ["pending_payment", "placed", "processing", "shipped", "delivered", "cancelled"]).default("placed").notNull(),
  awbCode: varchar("awbCode", { length: 100 }),
  trackingUrl: text("trackingUrl"),
  shippingProvider: varchar("shippingProvider", { length: 50 }),
  notes: text("notes"),
  utmSource: varchar("utmSource", { length: 200 }),
  utmMedium: varchar("utmMedium", { length: 200 }),
  utmCampaign: varchar("utmCampaign", { length: 200 }),
  utmContent: varchar("utmContent", { length: 200 }),
  utmTerm: varchar("utmTerm", { length: 200 }),
  source: varchar("source", { length: 10 }), // "app" | "web" (order channel)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  // Customer order history & phone lookup (chatbot), both sorted by recency.
  customerCreatedIdx: index("orders_customerId_createdAt_idx").on(t.customerId, t.createdAt),
  phoneCreatedIdx: index("orders_phone_createdAt_idx").on(t.phone, t.createdAt),
  // Admin list / dashboard / analytics scan ordered by recency.
  createdIdx: index("orders_createdAt_idx").on(t.createdAt),
}));
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Product reviews submitted by customers.
 */
export const productReviews = mysqlTable("productReviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  customerId: int("customerId").default(0).notNull(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  orderId: varchar("orderId", { length: 50 }),
  rating: int("rating").notNull(), // 1-5
  title: varchar("title", { length: 255 }),
  body: text("body"),
  images: json("images").$type<string[]>().default([]),
  verified: boolean("verified").default(false).notNull(), // verified purchase
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("approved").notNull(),
  helpfulCount: int("helpfulCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  productCreatedIdx: index("productReviews_productId_createdAt_idx").on(t.productId, t.createdAt),
  customerIdx: index("productReviews_customerId_idx").on(t.customerId),
  statusIdx: index("productReviews_status_idx").on(t.status),
}));
export type ProductReview = typeof productReviews.$inferSelect;
export type InsertProductReview = typeof productReviews.$inferInsert;

/**
 * WhatsApp newsletter subscribers.
 */
export const whatsappSubscribers = mysqlTable("whatsappSubscribers", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 15 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WhatsappSubscriber = typeof whatsappSubscribers.$inferSelect;
export type InsertWhatsappSubscriber = typeof whatsappSubscribers.$inferInsert;

export const emailSubscribers = mysqlTable("emailSubscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EmailSubscriber = typeof emailSubscribers.$inferSelect;
export type InsertEmailSubscriber = typeof emailSubscribers.$inferInsert;

/**
 * Blog articles for SEO content.
 */
export const blogPosts = mysqlTable("blogPosts", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  excerpt: text("excerpt"),
  content: longtext("content"),
  coverImage: text("coverImage"),
  category: varchar("category", { length: 100 }),
  tags: text("tags"), // JSON array of tag strings
  author: varchar("author", { length: 255 }).default("Nutriwow Team"),
  seoTitle: varchar("seoTitle", { length: 500 }),
  seoDescription: text("seoDescription"),
  status: varchar("status", { length: 20 }).default("draft").notNull(), // 'draft' | 'published'
  published: boolean("published").default(false).notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  // Public blog list: WHERE published ORDER BY createdAt DESC.
  publishedCreatedIdx: index("blogPosts_published_createdAt_idx").on(t.published, t.createdAt),
}));
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

/**
 * Coupon codes for discounts at checkout.
 */
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: varchar("description", { length: 255 }),
  discountType: mysqlEnum("discountType", ["percent", "flat"]).notNull().default("percent"),
  discountValue: int("discountValue").notNull(), // percent (0-100) or flat amount in rupees
  minOrderAmount: int("minOrderAmount").default(0).notNull(), // minimum cart value to apply
  maxUses: int("maxUses").default(0).notNull(), // 0 = unlimited (global)
  perUserLimit: int("perUserLimit").default(0).notNull(), // 0 = unlimited per customer
  usedCount: int("usedCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

/**
 * Products catalog — all store products stored in DB.
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 500 }).notNull(),
  handle: varchar("handle", { length: 255 }).notNull().unique(), // URL slug e.g. "premium-cashews-400g"
  category: varchar("category", { length: 100 }).notNull().default("Nuts"),
  price: int("price").notNull(), // in paise (rupees * 100) — stored as integer
  mrp: int("mrp").notNull(), // original MRP in paise
  discount: int("discount").notNull().default(0), // percentage
  weight: varchar("weight", { length: 100 }).default(""),
  description: longtext("description"),
  ingredients: text("ingredients"),
  nutritionalInfo: text("nutritionalInfo"),
  shelfLife: varchar("shelfLife", { length: 100 }),
  storageInfo: text("storageInfo"),
  image: text("image").notNull(), // primary image URL (S3)
  images: json("images"), // array of additional image URLs (S3)
  isBestseller: boolean("isBestseller").default(false).notNull(),
  isTrending: boolean("isTrending").default(false).notNull(),
  isNew: boolean("isNew").default(false).notNull(),
  available: boolean("available").default(true).notNull(),
  status: mysqlEnum("status", ["draft", "published"]).default("published").notNull(), // draft = hidden from storefront
  rating: int("rating").default(45).notNull(), // stored as rating*10 e.g. 4.5 = 45
  reviewCount: int("reviewCount").default(0).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(), // for manual ordering
  // Metafields (Shopify parity)
  dietaryPreferences: json("dietaryPreferences"), // string[] e.g. ["Vegan", "Gluten Free"]
  allergenInfo: text("allergenInfo"), // e.g. "Contains tree nuts. May contain traces of peanuts."
  nutType: varchar("nutType", { length: 100 }), // e.g. "Cashew", "Almond"
  processingMethod: varchar("processingMethod", { length: 100 }), // e.g. "Raw", "Roasted", "Salted"
  foodProductForm: varchar("foodProductForm", { length: 100 }), // e.g. "Whole", "Halves", "Powder"
  // Custom metafields (admin-defined in Settings → Metafields): { key: value }
  metafields: json("metafields"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  // Storefront listings filter by status (+available) and category, ordered by sortOrder.
  statusSortIdx: index("products_status_sortOrder_idx").on(t.status, t.sortOrder),
  categoryIdx: index("products_category_idx").on(t.category),
}));
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Product images — multiple images per product with hero flag.
 * Replaces the old `images` JSON column for proper management.
 */
export const productImages = mysqlTable("productImages", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  url: text("url").notNull(),           // S3 CDN URL
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key for deletion
  isHero: boolean("isHero").default(false).notNull(), // primary/hero image
  sortOrder: int("sortOrder").default(0).notNull(),   // display order
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  // Fetched for every product (hot path): WHERE productId ORDER BY sortOrder.
  productSortIdx: index("productImages_productId_sortOrder_idx").on(t.productId, t.sortOrder),
}));
export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = typeof productImages.$inferInsert;

/**
 * Product stock levels tracked by admin.
 */
export const productStock = mysqlTable("productStock", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().unique(), // matches product id in products.ts
  stock: int("stock").default(100).notNull(), // quantity in units
  lowStockThreshold: int("lowStockThreshold").default(10).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProductStock = typeof productStock.$inferSelect;
export type InsertProductStock = typeof productStock.$inferInsert;

/**
 * Login OTPs. One row per phone (upsert on send). Replaces the in-memory Map,
 * which did not work across serverless instances. Stores only a hash of the code,
 * plus counters used for send rate-limiting and verify attempt-limiting.
 */
export const otpCodes = mysqlTable("otpCodes", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  codeHash: varchar("codeHash", { length: 64 }).notNull(), // sha256 hex of the OTP
  expiresAt: timestamp("expiresAt").notNull(),
  attempts: int("attempts").default(0).notNull(), // failed verify attempts for current code
  sendCount: int("sendCount").default(0).notNull(), // sends in the current rate-limit window
  windowStartedAt: timestamp("windowStartedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = typeof otpCodes.$inferInsert;

/**
 * Store settings — key-value store for all admin configuration.
 * Each key maps to a JSON value so any setting can be persisted.
 */
export const storeSettings = mysqlTable("storeSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: json("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StoreSetting = typeof storeSettings.$inferSelect;
export type InsertStoreSetting = typeof storeSettings.$inferInsert;

/**
 * Abandoned carts — customers who added items but didn't complete checkout.
 */
export const abandonedCarts = mysqlTable("abandonedCarts", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId"),
  phone: varchar("phone", { length: 15 }),
  name: varchar("name", { length: 255 }),
  items: json("items").notNull(), // array of cart items
  total: int("total").notNull().default(0),
  recovered: boolean("recovered").default(false).notNull(),
  source: varchar("source", { length: 10 }),        // "app" | "web"
  location: varchar("location", { length: 160 }),   // IP-derived "City, Region, Country"
  sessionId: varchar("sessionId", { length: 64 }),  // anonymous browser/device id for guest dedup
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  phoneIdx: index("abandonedCarts_phone_idx").on(t.phone),
  sessionIdx: index("abandonedCarts_session_idx").on(t.sessionId),
}));
export type AbandonedCart = typeof abandonedCarts.$inferSelect;
export type InsertAbandonedCart = typeof abandonedCarts.$inferInsert;

/**
 * WhatsApp message logs — tracks every message sent via Meta Cloud API.
 */
export const whatsappLogs = mysqlTable("whatsappLogs", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 15 }).notNull(),
  customerName: varchar("customerName", { length: 255 }),
  messageType: varchar("messageType", { length: 50 }).notNull(), // order_confirmed, order_shipped, order_delivered, abandoned_cart, campaign
  templateName: varchar("templateName", { length: 100 }),
  messageContent: text("messageContent"), // actual message body for preview in admin
  orderId: varchar("orderId", { length: 20 }),
  campaignId: int("campaignId"),
  status: varchar("status", { length: 20 }).default("sent").notNull(), // sent, delivered, failed
  metaMessageId: varchar("metaMessageId", { length: 255 }), // WhatsApp message ID from Meta
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});
export type WhatsappLog = typeof whatsappLogs.$inferSelect;
export type InsertWhatsappLog = typeof whatsappLogs.$inferInsert;

/**
 * WhatsApp templates — promotional message templates with image, button, and Meta approval.
 */
export const whatsappTemplates = mysqlTable("whatsappTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  title: text("title").notNull(), // offer/promotion text
  imageUrl: text("imageUrl"), // product image URL - nullable
  buttonText: varchar("buttonText", { length: 100 }).notNull(), // e.g., "Shop now"
  buttonUrl: text("buttonUrl").notNull(), // CTA URL
  metaTemplateId: varchar("metaTemplateId", { length: 255 }), // Meta's template ID after approval - nullable
  approvalStatus: varchar("approvalStatus", { length: 20 }).default("pending").notNull(), // pending, approved, rejected
  approvalMessage: text("approvalMessage"), // Meta's approval/rejection reason - nullable
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type InsertWhatsappTemplate = typeof whatsappTemplates.$inferInsert;

/**
 * WhatsApp contacts — customer contacts uploaded for campaigns.
 */
export const whatsappContacts = mysqlTable("whatsappContacts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 15 }).notNull(),
  campaignId: int("campaignId").notNull(), // which campaign this contact belongs to
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, sent, delivered, failed
  sentAt: timestamp("sentAt"),
  deliveredAt: timestamp("deliveredAt"),
  failureReason: text("failureReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WhatsappContact = typeof whatsappContacts.$inferSelect;
export type InsertWhatsappContact = typeof whatsappContacts.$inferInsert;

/**
 * WhatsApp campaigns — broadcast messages sent to customer segments.
 */
export const whatsappCampaigns = mysqlTable("whatsappCampaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  message: text("message").notNull(), // message body text
  templateId: int("templateId"), // link to whatsappTemplates
  imageUrl: text("imageUrl"), // product image URL
  buttonText: varchar("buttonText", { length: 100 }), // e.g., "Shop now"
  buttonUrl: text("buttonUrl"), // CTA URL
  targetSegment: varchar("targetSegment", { length: 50 }).default("all").notNull(), // all, recent, inactive, uploaded
  totalSent: int("totalSent").default(0).notNull(),
  totalDelivered: int("totalDelivered").default(0).notNull(),
  totalFailed: int("totalFailed").default(0).notNull(),
  status: varchar("status", { length: 20 }).default("draft").notNull(), // draft, sending, completed, failed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt"),
});
export type WhatsappCampaign = typeof whatsappCampaigns.$inferSelect;
export type InsertWhatsappCampaign = typeof whatsappCampaigns.$inferInsert;

/**
 * WhatsApp conversations — one row per unique customer phone thread.
 */
export const whatsappConversations = mysqlTable("whatsappConversations", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 15 }).notNull().unique(),
  customerName: varchar("customerName", { length: 255 }),
  lastMessage: text("lastMessage"),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  unreadCount: int("unreadCount").default(0).notNull(),
  status: varchar("status", { length: 20 }).default("open").notNull(), // open, resolved
  assignedTo: varchar("assignedTo", { length: 100 }), // admin name
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WhatsappConversation = typeof whatsappConversations.$inferSelect;
export type InsertWhatsappConversation = typeof whatsappConversations.$inferInsert;

/**
 * WhatsApp messages — individual messages in a conversation thread.
 */
export const whatsappMessages = mysqlTable("whatsappMessages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  phone: varchar("phone", { length: 15 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(), // inbound | outbound
  messageType: varchar("messageType", { length: 30 }).default("text").notNull(), // text, image, document, template
  content: text("content").notNull(),
  mediaUrl: text("mediaUrl"), // image/video/document URL
  buttonText: varchar("buttonText", { length: 100 }), // CTA button label
  buttonUrl: text("buttonUrl"), // CTA button URL
  metaMessageId: varchar("metaMessageId", { length: 255 }),
  status: varchar("status", { length: 20 }).default("sent").notNull(), // sent, delivered, read, failed
  sentAt: timestamp("sentAt").defaultNow().notNull(),
}, (t) => ({
  // Conversation thread view: WHERE conversationId ORDER BY sentAt.
  conversationSentIdx: index("whatsappMessages_conversationId_sentAt_idx").on(t.conversationId, t.sentAt),
}));
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = typeof whatsappMessages.$inferInsert;

/**
 * Page views — tracks every page visit for analytics.
 */
export const pageViews = mysqlTable("pageViews", {
  id: int("id").autoincrement().primaryKey(),
  path: varchar("path", { length: 500 }).notNull(),
  referrer: varchar("referrer", { length: 500 }),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  device: varchar("device", { length: 20 }), // mobile, desktop, tablet
  browser: varchar("browser", { length: 50 }),
  os: varchar("os", { length: 50 }),
  sessionId: varchar("sessionId", { length: 64 }), // anonymous session fingerprint
  customerId: int("customerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  // Analytics queries filter/aggregate over a createdAt date range.
  createdIdx: index("pageViews_createdAt_idx").on(t.createdAt),
}));
export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = typeof pageViews.$inferInsert;


/**
 * Homepage sections — admin-managed product placement on homepage.
 * sectionType: which section the product belongs to (bestseller, trending, featured, new_arrivals)
 */
export const homepageSections = mysqlTable("homepageSections", {
  id: int("id").autoincrement().primaryKey(),
  sectionType: varchar("sectionType", { length: 50 }).notNull(), // bestseller, trending, featured, new_arrivals
  productId: int("productId").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type HomepageSection = typeof homepageSections.$inferSelect;
export type InsertHomepageSection = typeof homepageSections.$inferInsert;

/**
 * Back-in-stock alerts — customers who asked to be notified when an
 * out-of-stock product is available again. Cleared after notifications send.
 */
export const stockAlerts = mysqlTable("stockAlerts", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  phone: varchar("phone", { length: 15 }),
  email: varchar("email", { length: 320 }),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StockAlert = typeof stockAlerts.$inferSelect;
export type InsertStockAlert = typeof stockAlerts.$inferInsert;

/**
 * Email send logs — one row per recipient per campaign send.
 */
export const emailLogs = mysqlTable("emailLogs", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: varchar("campaignId", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  messageId: varchar("messageId", { length: 255 }),
  status: varchar("status", { length: 20 }).default("sent").notNull(),
  error: text("error"),
  openCount: int("openCount").default(0).notNull(),
  openedAt: timestamp("openedAt"),
  clickCount: int("clickCount").default(0).notNull(),
  clickedAt: timestamp("clickedAt"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

/**
 * Admin users — multi-user admin panel authentication.
 */
export const adminUsers = mysqlTable("adminUsers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 200 }),
  mobile: varchar("mobile", { length: 15 }),
  passwordHash: varchar("passwordHash", { length: 200 }).notNull(),
  role: mysqlEnum("adminRole", ["owner", "admin", "manager"]).default("admin").notNull(),
  resetToken: varchar("resetToken", { length: 128 }),
  resetTokenExp: timestamp("resetTokenExp"),
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

/**
 * Cart funnel events — tracks each step of the checkout funnel for analytics.
 */
export const cartEvents = mysqlTable("cartEvents", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  customerId: int("customerId"),
  event: varchar("event", { length: 30 }).notNull(), // add_to_cart, view_cart, start_checkout, enter_address, select_payment, order_placed
  productId: int("productId"),
  cartValue: int("cartValue").default(0).notNull(), // in paise
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  sessionIdx: index("cartEvents_sessionId_idx").on(t.sessionId),
  eventIdx: index("cartEvents_event_idx").on(t.event),
  createdIdx: index("cartEvents_createdAt_idx").on(t.createdAt),
}));
export type CartEvent = typeof cartEvents.$inferSelect;
export type InsertCartEvent = typeof cartEvents.$inferInsert;

/**
 * Email unsubscribes — emails that opted out of marketing.
 */
export const emailUnsubscribes = mysqlTable("emailUnsubscribes", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EmailUnsubscribe = typeof emailUnsubscribes.$inferSelect;
export type InsertEmailUnsubscribe = typeof emailUnsubscribes.$inferInsert;

/**
 * Referrals — tracks refer-a-friend codes and completions.
 */
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerCustomerId: int("referrerCustomerId").notNull(),
  referralCode: varchar("referralCode", { length: 20 }).notNull().unique(),
  referredCustomerId: int("referredCustomerId"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (t) => ({
  referrerIdx: index("referrals_referrerCustomerId_idx").on(t.referrerCustomerId),
}));
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

/**
 * Loyalty points — tracks earned, redeemed, expired, and bonus points per customer.
 */
export const loyaltyPoints = mysqlTable("loyaltyPoints", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  points: int("points").notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  description: varchar("description", { length: 200 }),
  orderId: varchar("orderId", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  customerIdx: index("loyalty_customer_idx").on(t.customerId),
}));
export type LoyaltyPoint = typeof loyaltyPoints.$inferSelect;
export type InsertLoyaltyPoint = typeof loyaltyPoints.$inferInsert;
