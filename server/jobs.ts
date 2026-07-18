import crypto from "crypto";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import {
  abandonedCarts,
  orders,
  whatsappCampaigns,
  whatsappContacts,
  whatsappLogs,
  whatsappTemplates,
} from "../drizzle/schema";
import {
  createEmailLog,
  getDb,
  getMarketableEmails,
  getStoreSetting,
  getUnsubscribedEmails,
  incrementStockForOrder,
  refundRedeemedPoints,
  setStoreSetting,
} from "./db";
import { sendCampaignEmail } from "./email";
import {
  parseProductCampaignPayload,
  sendAbandonedCartRecovery,
  sendCampaignTemplateMessage,
  sendProductCampaignMessage,
  updateCampaignStats,
} from "./whatsapp";
import { ENV } from "./_core/env";
import * as Sentry from "@sentry/node";

export async function getResendConfigForJobs(): Promise<{ apiKey: string; from: string }> {
  let k = await getStoreSetting("resendApiKey");
  if (typeof k === "string") { try { k = JSON.parse(k); } catch { /* keep raw */ } }
  let f = await getStoreSetting("resendFrom");
  if (typeof f === "string") { try { f = JSON.parse(f); } catch { /* keep raw */ } }
  return {
    apiKey: (typeof k === "string" ? k.trim() : "") || ENV.resendApiKey,
    from: (typeof f === "string" ? f.trim() : "") || ENV.resendFrom,
  };
}

export async function processEmailCampaignBatch(batchSize = 20) {
  let v = await getStoreSetting("emailCampaigns");
  if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = null; } }
  const list: any[] = Array.isArray(v) ? v : [];
  const camp = list.find((c: any) => c.status === "queued" || c.status === "sending");
  if (!camp) return { done: true, message: "No pending email campaigns" };

  const pending: string[] = camp.pendingRecipients || [];
  if (pending.length === 0) {
    camp.status = "sent";
    camp.sentAt = new Date().toISOString();
    delete camp.pendingRecipients;
    await setStoreSetting("emailCampaigns", list);
    return { done: true, campaignId: camp.id, totalSent: camp.sentCount || 0 };
  }

  camp.status = "sending";
  const batch = pending.splice(0, batchSize);
  camp.pendingRecipients = pending;

  const rc = await getResendConfigForJobs();
  const cookieSecret = process.env.COOKIE_SECRET || process.env.JWT_SECRET || "nutriwow-unsub";
  let sent = camp.sentCount || 0;

  for (const to of batch) {
    const unsubToken = crypto.createHmac("sha256", cookieSecret).update(to.toLowerCase()).digest("hex").slice(0, 16);
    const unsubUrl = `https://www.nutriwow.in/api/unsubscribe?email=${encodeURIComponent(to)}&token=${unsubToken}`;
    const logId = await createEmailLog(camp.id, to);

    let trackedHtml = camp.html;
    if (logId) {
      const pixel = `<img src="https://www.nutriwow.in/api/track/open/${logId}" width="1" height="1" style="display:none" alt="" />`;
      trackedHtml = trackedHtml.replace(/<\/body>/i, `${pixel}</body>`);
      if (!trackedHtml.includes(pixel)) trackedHtml += pixel;
      trackedHtml = trackedHtml.replace(/href="(https?:\/\/[^"]+)"/g, (_: string, url: string) => {
        if (url.includes("/api/track/") || url.includes("/api/unsubscribe")) return `href="${url}"`;
        return `href="https://www.nutriwow.in/api/track/click/${logId}?url=${encodeURIComponent(url)}"`;
      });
    }
    trackedHtml = trackedHtml.replace(/<\/body>/i,
      `<div style="text-align:center;padding:20px 0;font-size:12px;color:#999;">` +
      `You're receiving this because you're a Nutriwow customer. ` +
      `<a href="${unsubUrl}" style="color:#999;text-decoration:underline;">Unsubscribe</a></div></body>`
    );

    const r = await sendCampaignEmail(to, camp.subject, trackedHtml, {
      resendApiKey: rc.apiKey || undefined,
      resendFrom: rc.from || undefined,
    });
    if (r.ok) sent++;
    else if (logId) await createEmailLog(camp.id, to, undefined, r.error || "send failed");
    await new Promise((res) => setTimeout(res, 80));
  }

  camp.sentCount = sent;
  if (pending.length === 0) {
    camp.status = "sent";
    camp.sentAt = new Date().toISOString();
    delete camp.pendingRecipients;
  }
  await setStoreSetting("emailCampaigns", list);
  return { done: pending.length === 0, campaignId: camp.id, batchSent: batch.length, remaining: pending.length, totalSent: sent };
}

export async function processWhatsAppCampaignBatch(batchSize = 20, campaignId?: number) {
  const db = await getDb();
  if (!db) return { done: true, message: "Database not available" };

  const [campaign] = await db.select().from(whatsappCampaigns)
    .where(campaignId
      ? and(eq(whatsappCampaigns.id, campaignId), sql`${whatsappCampaigns.status} IN ('queued', 'sending')`)
      : sql`${whatsappCampaigns.status} IN ('queued', 'sending')`)
    .orderBy(asc(whatsappCampaigns.createdAt))
    .limit(1);
  if (!campaign) return { done: true, message: "No pending WhatsApp campaigns" };

  const pending = await db.select().from(whatsappContacts)
    .where(and(eq(whatsappContacts.campaignId, campaign.id), eq(whatsappContacts.status, "pending")))
    .orderBy(asc(whatsappContacts.id))
    .limit(batchSize);

  if (pending.length === 0) {
    const [failedResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(whatsappContacts)
      .where(and(eq(whatsappContacts.campaignId, campaign.id), eq(whatsappContacts.status, "failed")));
    await updateCampaignStats(campaign.id, {
      status: "completed",
      totalFailed: Number(failedResult?.count ?? 0),
    });
    return { done: true, campaignId: campaign.id };
  }

  await db.update(whatsappCampaigns).set({ status: "sending" }).where(eq(whatsappCampaigns.id, campaign.id));
  const [template] = campaign.templateId
    ? await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.id, campaign.templateId)).limit(1)
    : [];
  if (!template) {
    await updateCampaignStats(campaign.id, { status: "failed" });
    return { done: true, campaignId: campaign.id, message: "Campaign template not found" };
  }

  let sent = 0;
  let failed = 0;
  const productPayload = parseProductCampaignPayload(campaign.message);
  for (const contact of pending) {
    try {
      const result = productPayload
        ? await sendProductCampaignMessage({
            phone: contact.phone,
            customerName: contact.name || "Customer",
            templateName: template.name,
            payload: productPayload,
            buttonText: campaign.buttonText || undefined,
            campaignId: campaign.id,
          })
        : await sendCampaignTemplateMessage({
            phone: contact.phone,
            customerName: contact.name || "Customer",
            templateName: template.name,
            templateTitle: campaign.message,
            imageUrl: campaign.imageUrl || undefined,
            buttonText: campaign.buttonText || undefined,
            buttonUrl: campaign.buttonUrl || undefined,
            campaignId: campaign.id,
          });
      if (result.success) {
        sent++;
        await db.update(whatsappContacts)
          .set({ status: "sent", sentAt: new Date(), failureReason: null })
          .where(eq(whatsappContacts.id, contact.id));
      } else {
        failed++;
        await db.update(whatsappContacts)
          .set({ status: "failed", failureReason: result.error || "send failed" })
          .where(eq(whatsappContacts.id, contact.id));
      }
    } catch (err: any) {
      failed++;
      await db.update(whatsappContacts)
        .set({ status: "failed", failureReason: err?.message || "send failed" })
        .where(eq(whatsappContacts.id, contact.id));
    }
    await new Promise(r => setTimeout(r, 150));
  }

  await db.update(whatsappCampaigns)
    .set({
      totalSent: sql`${whatsappCampaigns.totalSent} + ${sent}`,
      totalFailed: sql`${whatsappCampaigns.totalFailed} + ${failed}`,
    })
    .where(eq(whatsappCampaigns.id, campaign.id));

  const [remaining] = await db.select({ count: sql<number>`COUNT(*)` }).from(whatsappContacts)
    .where(and(eq(whatsappContacts.campaignId, campaign.id), eq(whatsappContacts.status, "pending")));
  if (Number(remaining?.count ?? 0) === 0) {
    await updateCampaignStats(campaign.id, { status: "completed" });
  }

  return {
    done: Number(remaining?.count ?? 0) === 0,
    campaignId: campaign.id,
    batchSent: sent,
    batchFailed: failed,
    remaining: Number(remaining?.count ?? 0),
  };
}

export async function processAbandonedCartRecoveryBatch(batchSize = 20) {
  const db = await getDb();
  if (!db) return { done: true, message: "Database not available" };

  const cutoff = new Date(Date.now() - 45 * 60 * 1000);
  const carts = await db.select().from(abandonedCarts)
    .where(and(eq(abandonedCarts.recovered, false), lt(abandonedCarts.updatedAt, cutoff)))
    .orderBy(asc(abandonedCarts.updatedAt))
    .limit(batchSize);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const cart of carts) {
    if (!cart.phone) { skipped++; continue; }
    const [existing] = await db.select().from(whatsappLogs)
      .where(and(
        eq(whatsappLogs.phone, cart.phone),
        eq(whatsappLogs.messageType, "abandoned_cart"),
        gte(whatsappLogs.sentAt, cart.updatedAt),
      ))
      .orderBy(desc(whatsappLogs.sentAt))
      .limit(1);
    if (existing) { skipped++; continue; }

    const items = ((cart.items as Array<{ name?: string }>) || []).map(i => i?.name).filter(Boolean).join(", ");
    const result = await sendAbandonedCartRecovery({
      phone: cart.phone,
      customerName: cart.name || "Customer",
      cartItems: items || "your selected items",
      cartTotal: cart.total,
      cartId: cart.id,
    }).catch((err) => ({ success: false, error: err?.message || "send failed" }));
    if (result.success) sent++;
    else failed++;
    await new Promise(r => setTimeout(r, 150));
  }

  return { done: carts.length < batchSize, processed: carts.length, sent, skipped, failed };
}

export async function releaseStalePendingOrders(batchSize = 50) {
  const db = await getDb();
  if (!db) return { done: true, message: "Database not available" };

  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const staleOrders = await db.select().from(orders)
    .where(and(eq(orders.status, "pending_payment"), lt(orders.createdAt, cutoff)))
    .orderBy(asc(orders.createdAt))
    .limit(batchSize);

  let cancelled = 0;
  let restored = 0;
  for (const order of staleOrders) {
    const result = await db.update(orders)
      .set({ status: "cancelled" })
      .where(and(eq(orders.id, order.id), eq(orders.status, "pending_payment")));
    const affected = (result as unknown as [{ affectedRows?: number }])?.[0]?.affectedRows ?? 0;
    if (affected === 0) continue;

    cancelled++;
    const items = Array.isArray(order.items) ? order.items as { id: string; quantity: number }[] : [];
    try {
      await incrementStockForOrder(items);
      restored++;
    } catch (err) {
      console.error(`[cron] Failed to restore stock for stale order ${order.id}`, err);
      Sentry.captureException(err, { extra: { orderId: order.id, context: "stale-order-stock-restore" } });
    }
    // Give back any loyalty points redeemed on the abandoned prepaid order.
    try { await refundRedeemedPoints(order.id); } catch (err) {
      console.error(`[cron] Failed to refund points for stale order ${order.id}`, err);
    }
  }

  return { done: staleOrders.length < batchSize, processed: staleOrders.length, cancelled, restored };
}

export async function processCronJobs() {
  const [email, whatsapp, abandonedCarts, staleOrders] = await Promise.all([
    processEmailCampaignBatch(),
    processWhatsAppCampaignBatch(),
    processAbandonedCartRecoveryBatch(),
    releaseStalePendingOrders(),
  ]);
  return { ok: true, email, whatsapp, abandonedCarts, staleOrders };
}

export async function queueEmailCampaign(campaignId: string) {
  let v = await getStoreSetting("emailCampaigns");
  if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = null; } }
  const list: any[] = Array.isArray(v) ? v : [];
  const camp = list.find((c) => c.id === campaignId);
  if (!camp) throw new Error("Campaign not found.");
  if (camp.status === "sent") throw new Error("This campaign was already sent.");

  const allRecipients = await getMarketableEmails(camp.audience === "buyers" ? "buyers" : "all");
  const unsubs = await getUnsubscribedEmails();
  const recipients = allRecipients.filter(e => !unsubs.has(e.toLowerCase()));
  camp.recipientCount = recipients.length;
  camp.pendingRecipients = recipients;
  camp.sentCount = 0;
  camp.status = "queued";
  await setStoreSetting("emailCampaigns", list);
  return { ok: true, recipientCount: recipients.length, status: "queued" };
}
