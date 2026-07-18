/*
 * Foodondoor Admin - Orders Page
 * Shopify-style: tab filters, search, inline status update, order detail slide-over panel
 * + Ship Order via Shiprocket / iThink Logistics
 * Shipment info (AWB, tracking URL, provider) stored in DB via adminOrders.updateShipping
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search, Eye, X, Package, Truck, CheckCircle2, Clock,
  RefreshCw, Check, ExternalLink, Loader2, MapPin, Printer, Download, FileText, RotateCcw
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { type AdminOrder } from "@/lib/adminStore";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { openGSTInvoice } from "@/components/GSTInvoice";

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; bg: string; border: string }> = {
  placed:     { label: "Placed",     color: "text-blue-700",   dot: "bg-blue-500",   bg: "bg-blue-50",   border: "border-blue-200" },
  processing: { label: "Processing", color: "text-amber-700",  dot: "bg-amber-500",  bg: "bg-amber-50",  border: "border-amber-200" },
  shipped:    { label: "Shipped",    color: "text-purple-700", dot: "bg-purple-500", bg: "bg-purple-50", border: "border-purple-200" },
  delivered:  { label: "Delivered",  color: "text-green-700",  dot: "bg-green-500",  bg: "bg-green-50",  border: "border-green-200" },
  cancelled:  { label: "Cancelled",  color: "text-red-700",    dot: "bg-red-500",    bg: "bg-red-50",    border: "border-red-200" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.placed;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Ship Order Modal ─────────────────────────────────────────────────────────
function ShipOrderModal({
  order,
  onClose,
  onShipped,
}: {
  order: AdminOrder;
  onClose: () => void;
  onShipped: () => void;
}) {
  // Load default shipping channel from DB settings
  const { data: settingsData } = trpc.settings.getAll.useQuery();
  const [provider, setProvider] = useState<"shiprocket" | "ithink">("shiprocket");
  const [weight, setWeight] = useState("0.5");
  const [length, setLength] = useState("15");
  const [breadth, setBreadth] = useState("12");
  const [height, setHeight] = useState("8");
  const [courierId, setCourierId] = useState<number | undefined>(undefined);

  // Couriers serviceable for this route (Shiprocket only). Delhivery is flagged
  // recommended and pre-selected; the admin can pick a different one.
  const isCod = order.paymentMethod === "COD";
  const couriersQuery = trpc.shipping.couriers.useQuery(
    { provider, deliveryPin: order.pincode, weight: parseFloat(weight) || 0.5, cod: isCod },
    { enabled: provider === "shiprocket", staleTime: 60_000 },
  );
  const couriers = couriersQuery.data?.couriers ?? [];

  // Pre-select the recommended (Delhivery) courier once the list loads.
  useEffect(() => {
    if (provider !== "shiprocket") { setCourierId(undefined); return; }
    const list = couriersQuery.data?.couriers ?? [];
    if (list.length === 0) return;
    setCourierId(prev => {
      if (prev && list.some(c => c.courierId === prev)) return prev;
      const rec = list.find(c => c.isRecommended) ?? list[0];
      return rec?.courierId;
    });
  }, [provider, couriersQuery.data]);

  // Set default provider from DB settings once loaded
  useEffect(() => {
    if (!settingsData) return;
    try {
      // settings is a Record<string, unknown> where values are JSON strings
      const shippingRaw = (settingsData as Record<string, unknown>)["shipping"];
      if (shippingRaw) {
        const shipping = typeof shippingRaw === "string" ? JSON.parse(shippingRaw) : shippingRaw;
        if (shipping?.activeChannel && shipping.activeChannel !== "none") {
          setProvider(shipping.activeChannel as "shiprocket" | "ithink");
        }
      }
    } catch { /* ignore parse errors */ }
  }, [settingsData]);

  const utils = trpc.useUtils();
  const updateShipping = trpc.adminOrders.updateShipping.useMutation({
    onSuccess: () => {
      utils.adminOrders.getAll.invalidate();
    },
  });

  const createShipment = trpc.shipping.create.useMutation({
    onSuccess: async (data) => {
      if (data.success && data.awb) {
        // Save AWB + tracking URL to DB
        await updateShipping.mutateAsync({
          id: order.id,
          awbCode: data.awb,
          trackingUrl: data.trackingUrl ?? undefined,
          shippingProvider: provider,
          status: "shipped",
        });
        onShipped();
        toast.success(`Shipment created! AWB: ${data.awb}`);
        onClose();
      } else {
        toast.error(data.error ?? "Failed to create shipment");
      }
    },
    onError: (err) => {
      toast.error(err.message ?? "Shipment creation failed");
    },
  });

  const handleShip = () => {
    createShipment.mutate({
      provider,
      orderId: order.id,
      orderDate: new Date(order.createdAt).toISOString().split("T")[0],
      customerName: order.customerName,
      phone: order.phone,
      email: order.email,
      address: order.address,
      city: order.city,
      state: order.state,
      pincode: order.pincode,
      items: order.items.map(i => ({
        name: i.name,
        sku: "",
        qty: i.quantity,
        price: i.price,
      })),
      totalAmount: order.total,
      paymentMethod: order.paymentMethod === "COD" ? "COD" : "Prepaid",
      codAmount: order.paymentMethod === "COD" ? order.total : undefined,
      weight: parseFloat(weight) || 0.5,
      length: parseFloat(length) || 15,
      breadth: parseFloat(breadth) || 12,
      height: parseFloat(height) || 8,
      courierId: provider === "shiprocket" ? courierId : undefined,
    });
  };

  const isPending = createShipment.isPending || updateShipping.isPending;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-[#43A047]" />
            <h3 className="text-[14px] font-bold text-gray-900">Ship Order #{order.id}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Provider Selection */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Shipping Provider</p>
            <div className="grid grid-cols-2 gap-2">
              {(["shiprocket", "ithink"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                    provider === p
                      ? "border-[#43A047] bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Truck size={16} className={provider === p ? "text-[#43A047]" : "text-gray-400"} />
                  <div>
                    <p className={`text-[12px] font-semibold ${provider === p ? "text-[#43A047]" : "text-gray-700"}`}>
                      {p === "shiprocket" ? "Shiprocket" : "iThink"}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {p === "shiprocket" ? "25+ couriers" : "Delhivery, FedEx"}
                    </p>
                  </div>
                  {provider === p && <CheckCircle2 size={14} className="text-[#43A047] ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Courier Selection (Shiprocket) */}
          {provider === "shiprocket" && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Courier</p>
              {couriersQuery.isLoading ? (
                <div className="flex items-center gap-2 text-[12px] text-gray-400 px-3 py-2">
                  <Loader2 size={13} className="animate-spin" /> Loading couriers…
                </div>
              ) : couriers.length === 0 ? (
                <p className="text-[11px] text-amber-600 px-3 py-2 bg-amber-50 rounded-lg">
                  {couriersQuery.data?.error ?? "No couriers found for this pincode — Shiprocket will auto-pick on ship."}
                </p>
              ) : (
                <select
                  value={courierId ?? ""}
                  onChange={e => setCourierId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#43A047] bg-white"
                >
                  {couriers.map(c => (
                    <option key={c.courierId} value={c.courierId}>
                      {c.courierName}{c.isRecommended ? " ⭐" : ""}{c.rate != null ? ` — ₹${c.rate}` : ""}{c.etd ? ` · ${c.etd}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Package Dimensions */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Package Details</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Weight (kg)</label>
                <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#43A047]" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Length (cm)</label>
                <input type="number" value={length} onChange={e => setLength(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#43A047]" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Breadth (cm)</label>
                <input type="number" value={breadth} onChange={e => setBreadth(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#43A047]" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Height (cm)</label>
                <input type="number" value={height} onChange={e => setHeight(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#43A047]" />
              </div>
            </div>
          </div>

          {/* Delivery Address Preview */}
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <MapPin size={10} /> Delivering To
            </p>
            <p className="text-[12px] text-gray-700 font-medium">{order.customerName}</p>
            <p className="text-[11px] text-gray-500">{order.address}, {order.city}, {order.state} – {order.pincode}</p>
            <p className="text-[11px] text-gray-500">{order.phone}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-[12px] font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleShip}
            disabled={isPending}
            className="px-5 py-2 text-[12px] font-semibold bg-[#43A047] text-white rounded-lg hover:bg-[#388E3C] transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {isPending ? (
              <><Loader2 size={13} className="animate-spin" /> Creating...</>
            ) : (
              <><Truck size={13} /> Create Shipment</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tracking Panel ───────────────────────────────────────────────────────────
function TrackingSection({ awbCode, provider, trackingUrl }: {
  awbCode: string;
  provider: string;
  trackingUrl?: string | null;
}) {
  const { data, isLoading } = trpc.shipping.track.useQuery(
    { provider: provider as "shiprocket" | "ithink", awb: awbCode },
    { refetchInterval: 60_000 }
  );

  return (
    <div className="px-5 py-4 border-b border-gray-100">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Truck size={11} /> Shipment Tracking
      </p>

      <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-purple-500 font-medium">AWB Number</p>
            <p className="text-[13px] font-bold text-purple-800 font-mono">{awbCode}</p>
            <p className="text-[10px] text-purple-400 mt-0.5 capitalize">{provider}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            {trackingUrl && (
              <a href={trackingUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-purple-600 hover:text-purple-800 font-medium">
                Track <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <Loader2 size={12} className="animate-spin" /> Fetching tracking...
        </div>
      ) : data?.success ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">
              {data.status ?? "In Transit"}
            </span>
            {data.location && (
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <MapPin size={9} /> {data.location}
              </span>
            )}
          </div>
          {data.history && data.history.length > 0 && (
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {data.history.slice(0, 5).map((h, i) => (
                <div key={i} className="flex gap-2 text-[10px]">
                  <span className="text-gray-400 flex-shrink-0 w-24">{h.date.slice(0, 16)}</span>
                  <span className="text-gray-600">{h.activity}</span>
                  {h.location && <span className="text-gray-400 flex-shrink-0">· {h.location}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-gray-400">{data?.error ?? "No tracking data available yet"}</p>
      )}
    </div>
  );
}

// ─── Invoice Print Helper ────────────────────────────────────────────────────
type InvoiceStoreInfo = {
  name?: string; legalName?: string; gstin?: string; address?: string; email?: string;
};

function printInvoice(order: AdminOrder, store?: InvoiceStoreInfo) {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) { toast.error("Please allow popups to print invoice"); return; }
  const date = new Date(order.createdAt);
  const brandName = store?.name || "Foodondoor";
  const invoiceEmail = store?.email || "orders@foodondoor.com";
  const invoiceTitle = store?.gstin ? "TAX INVOICE" : "INVOICE";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice #${order.id}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #222; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #43A047; padding-bottom: 16px; margin-bottom: 20px; }
    .brand { color: #2e7d32; font-size: 22px; font-weight: 800; }
    .brand-sub { color: #888; font-size: 11px; margin-top: 2px; }
    .invoice-meta { text-align: right; font-size: 12px; color: #555; }
    .invoice-meta strong { font-size: 16px; color: #222; display: block; margin-bottom: 4px; }
    .section { margin-bottom: 18px; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #888; letter-spacing: 0.08em; margin-bottom: 8px; }
    .address-box { background: #f9f9f9; border-radius: 8px; padding: 12px; font-size: 13px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f1f8e9; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; color: #555; }
    td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; }
    .totals { margin-left: auto; width: 240px; margin-top: 12px; }
    .totals tr td:first-child { color: #666; }
    .totals tr td:last-child { text-align: right; font-weight: 600; }
    .total-row td { font-size: 15px; font-weight: 800; color: #2e7d32; border-top: 2px solid #43A047; padding-top: 10px; }
    .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 14px; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #e8f5e9; color: #2e7d32; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">🌿 ${brandName}</div>
      <div class="brand-sub">Premium Dry Fruits & Healthy Snacks</div>
      ${store?.legalName ? `<div class="brand-sub" style="margin-top:4px">${store.legalName}</div>` : ""}
      ${store?.address ? `<div class="brand-sub">${store.address}</div>` : ""}
      ${store?.gstin ? `<div class="brand-sub">GSTIN: ${store.gstin}</div>` : ""}
      <div class="brand-sub" style="margin-top:4px">www.foodondoor.com · ${invoiceEmail}</div>
    </div>
    <div class="invoice-meta">
      <strong>${invoiceTitle}</strong>
      Order #${order.id}<br/>
      Date: ${date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}<br/>
      Time: ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}<br/>
      <span class="status-badge">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
    </div>
  </div>

  <div style="display:flex;gap:24px;margin-bottom:20px">
    <div class="section" style="flex:1">
      <div class="section-title">Bill To</div>
      <div class="address-box">
        <strong>${order.customerName}</strong><br/>
        ${order.phone}<br/>
        ${order.email || ""}
      </div>
    </div>
    <div class="section" style="flex:1">
      <div class="section-title">Ship To</div>
      <div class="address-box">
        ${order.address},<br/>
        ${order.city}, ${order.state} – ${order.pincode}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Order Items</div>
    <table>
      <thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
      <tbody>
        ${order.items.map((item, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${item.name}${item.weight ? " " + item.weight : ""}</td>
            <td>${item.quantity}</td>
            <td>₹${item.price.toLocaleString("en-IN")}</td>
            <td>₹${(item.price * item.quantity).toLocaleString("en-IN")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <table class="totals">
      <tr><td>Subtotal</td><td>₹${order.subtotal.toLocaleString("en-IN")}</td></tr>
      ${order.discount > 0 ? `<tr><td>Discount</td><td style="color:#2e7d32">-₹${order.discount.toLocaleString("en-IN")}</td></tr>` : ""}
      <tr><td>Shipping</td><td style="color:#2e7d32">${order.shipping === 0 ? "FREE" : "₹" + order.shipping}</td></tr>
      <tr class="total-row"><td>Total</td><td>₹${order.total.toLocaleString("en-IN")}</td></tr>
      <tr><td>Payment</td><td>${order.paymentMethod}</td></tr>
    </table>
  </div>

  <div class="footer">
    Thank you for shopping with ${brandName}! For queries: ${invoiceEmail}<br/>
    This is a computer-generated invoice and does not require a signature.
  </div>

  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;
  win.document.write(html);
  win.document.close();
}

// ─── Order Detail Panel ─────────────────────────────────────────────────────────
// Channel badge — where the order came from (mobile app vs website).
function OrderSourceBadge({ source }: { source?: string | null }) {
  const s = (source || "").toLowerCase();
  if (s !== "app" && s !== "web") return null;
  const app = s === "app";
  return (
    <span
      title={app ? "Ordered from the mobile app" : "Ordered from the website"}
      className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
        app ? "bg-indigo-100 text-indigo-700" : "bg-sky-100 text-sky-700"
      }`}
    >
      {app ? "📱 App" : "🌐 Web"}
    </span>
  );
}

function AdminGSTInvoiceButton({ orderId }: { orderId: string }) {
  const [clicked, setClicked] = useState(false);
  const invoiceQuery = trpc.adminOrders.getGSTInvoice.useQuery(
    { orderId },
    { enabled: clicked, retry: false }
  );
  // Branded PDF (same file the customer gets — Foodondoor header, brands, stamp)
  const pdfMut = trpc.adminOrders.getInvoiceUrl.useMutation({
    onSuccess: ({ url }: { url: string }) => { if (url) window.open(url, "_blank", "noopener"); },
    onError: (e: { message?: string }) => toast.error(e.message || "Could not generate invoice PDF"),
  });

  useEffect(() => {
    if (clicked && invoiceQuery.data) {
      openGSTInvoice(invoiceQuery.data as any);
      setClicked(false);
    }
    if (clicked && invoiceQuery.error) {
      toast.error("Failed to load GST invoice");
      setClicked(false);
    }
  }, [clicked, invoiceQuery.data, invoiceQuery.error]);

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => pdfMut.mutate({ orderId })}
        disabled={pdfMut.isPending}
        title="Download GST Tax Invoice (PDF)"
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        <FileText size={12} /> {pdfMut.isPending ? "Preparing…" : "Download Invoice"}
      </button>
      <button
        onClick={() => setClicked(true)}
        disabled={invoiceQuery.isLoading}
        title="Quick HTML view"
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
      >
        {invoiceQuery.isLoading ? "…" : "View"}
      </button>
    </div>
  );
}

function OrderDetailPanel({ order, onClose, onStatusChange, onShipOrder }: {
  order: AdminOrder;
  onClose: () => void;
  onStatusChange: (id: string, s: AdminOrder["status"]) => void;
  onShipOrder: (order: AdminOrder) => void;
}) {
  const [status, setStatus] = useState(order.status);
  // Shipment info comes directly from DB order fields
  const hasShipment = !!(order.awbCode);

  // Store/billing details for the invoice (Settings → Billing / General)
  const { data: allSettings } = trpc.settings.getAll.useQuery();
  const storeInfo = useMemo(() => {
    const parse = (k: string) => {
      const r = (allSettings as Record<string, unknown> | undefined)?.[k];
      if (!r) return {} as Record<string, string>;
      try { return (typeof r === "string" ? JSON.parse(r) : r) as Record<string, string>; }
      catch { return {} as Record<string, string>; }
    };
    const billing = parse("billing");
    const general = parse("general");
    return {
      name: general.storeName || "Foodondoor",
      legalName: billing.businessName || "",
      gstin: billing.gstin || general.storeGST || "",
      address: billing.billingAddress
        || [general.storeAddress, general.storeCity, general.storeState, general.storePincode].filter(Boolean).join(", "),
      email: general.storeEmail || billing.billingEmail || "",
    };
  }, [allSettings]);

  const handleChange = (s: AdminOrder["status"]) => {
    setStatus(s);
    onStatusChange(order.id, s);
    toast.success(`Order #${order.id} → ${STATUS_CONFIG[s].label}`);
  };

  // NW-PAY-02: admin-initiated Razorpay refund (full/partial).
  const utilsRefund = trpc.useUtils();
  const refundMutation = trpc.adminOrders.refund.useMutation({
    onSuccess: (d) => {
      utilsRefund.adminOrders.getAll.invalidate();
      toast.success(`Refunded ₹${d.refundedAmount} — status: ${d.refundStatus}`);
    },
    onError: (e) => toast.error(e.message),
  });
  const paid = order.amountPaid ?? 0;
  const refunded = order.refundedAmount ?? 0;
  const refundable = Math.max(0, paid - refunded);
  const canRefund = order.paymentMethod === "Razorpay" && refundable > 0 && order.refundStatus !== "full";
  const handleRefund = () => {
    const input = window.prompt(`Refund amount for #${order.id} (max ₹${refundable}). Leave blank for full refund:`, String(refundable));
    if (input === null) return;
    const amount = input.trim() === "" ? undefined : Number(input.trim());
    if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0 || amount > refundable)) {
      toast.error(`Enter an amount between ₹1 and ₹${refundable}.`);
      return;
    }
    if (!window.confirm(`Refund ₹${amount ?? refundable} to the customer via Razorpay? This cannot be undone.`)) return;
    refundMutation.mutate({ orderId: order.id, amount });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-[420px] bg-white h-full flex flex-col shadow-2xl">
        {/* Header — title + close only (actions moved to their own row below) */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-bold text-gray-900 truncate">#{order.id}</h2>
              <OrderSourceBadge source={(order as any).source} />
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              {" · "}
              {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
              {" · "}{order.items.length} item{order.items.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Action bar — wraps cleanly instead of overflowing the header */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex-shrink-0">
          {!hasShipment && (
            <button
              onClick={() => onShipOrder(order)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-[#43A047] text-white rounded-lg hover:bg-[#388E3C] transition-colors"
            >
              <Truck size={12} /> Ship Order
            </button>
          )}
          {order.status !== "placed" && (
            <>
              <AdminGSTInvoiceButton orderId={order.id} />
              <button
                onClick={() => printInvoice(order, storeInfo)}
                title="Print Invoice"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Printer size={12} /> Print
              </button>
            </>
          )}
          {canRefund && (
            <button
              onClick={handleRefund}
              disabled={refundMutation.isPending}
              title={`Refund up to ₹${refundable} via Razorpay`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <RotateCcw size={12} /> {refundMutation.isPending ? "Refunding…" : refunded > 0 ? `Refund (₹${refunded} done)` : "Refund"}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Status Selector */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(STATUS_CONFIG) as [AdminOrder["status"], typeof STATUS_CONFIG[string]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleChange(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                    status === key
                      ? `${cfg.bg} ${cfg.border} ${cfg.color} shadow-sm`
                      : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${status === key ? cfg.dot : "bg-gray-300"}`} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tracking (if shipped — AWB from DB) */}
          {hasShipment && order.awbCode && (
            <TrackingSection
              awbCode={order.awbCode}
              provider={order.shippingProvider ?? "shiprocket"}
              trackingUrl={order.trackingUrl}
            />
          )}

          {/* Customer Info */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Customer</p>
            <div className="space-y-1">
              <p className="text-[13px] font-semibold text-gray-900">{order.customerName}</p>
              <p className="text-[12px] text-gray-600">{order.email}</p>
              <p className="text-[12px] text-gray-600">{order.phone}</p>
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 font-medium mb-1">Delivery Address</p>
                <p className="text-[12px] text-gray-700">{order.address}</p>
                <p className="text-[12px] text-gray-700">{order.city}, {order.state} – {order.pincode}</p>
              </div>
              {order.notes && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 font-medium mb-1">Order Notes</p>
                  <p className="text-[12px] text-gray-700 whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Items ({order.items.length})
            </p>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <img src={item.image} alt={item.name}
                    className="w-11 h-11 object-contain rounded-lg bg-white border border-gray-100 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-gray-800 line-clamp-2">{item.name}</p>
                    <p className="text-[10px] text-gray-400">{item.weight} · Qty {item.quantity}</p>
                  </div>
                  <p className="text-[12px] font-bold text-gray-900 flex-shrink-0">
                    ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Summary</p>
            <div className="space-y-2">
              <div className="flex justify-between text-[12px] text-gray-600">
                <span>Subtotal</span><span>₹{order.subtotal.toLocaleString("en-IN")}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-[12px] text-green-600">
                  <span>Discount</span><span>-₹{order.discount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between text-[12px] text-gray-600">
                <span>Shipping</span>
                <span>{order.shipping === 0 ? <span className="text-green-600 font-medium">FREE</span> : `₹${order.shipping}`}</span>
              </div>
              <div className="flex justify-between text-[14px] font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span><span>₹{order.total.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>Payment</span><span className="font-medium text-gray-600">{order.paymentMethod}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const TABS = ["all", "placed", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrders() {
  // Dashboard shortcuts link here with ?status=placed etc. — open that tab directly
  const [tab, setTab] = useState(() => {
    try {
      const s = new URLSearchParams(window.location.search).get("status");
      return s && TABS.includes(s) ? s : "all";
    } catch { return "all"; }
  });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [shipOrderTarget, setShipOrderTarget] = useState<AdminOrder | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Record<string, AdminOrder["status"]>>({});

  // Fetch orders from DB via tRPC
  const { data: dbOrders, isLoading, refetch } = trpc.adminOrders.getAll.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  // Map DB orders to AdminOrder shape (including shipment fields from DB)
  const orders: AdminOrder[] = (dbOrders ?? []).map((o: any) => ({
    id: o.id,
    customerName: o.customerName,
    email: o.email ?? "",
    phone: o.phone,
    address: o.address,
    city: o.city,
    state: o.state ?? "",
    pincode: o.pincode,
    items: Array.isArray(o.items) ? o.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      image: item.image ?? "",
      weight: item.weight ?? "",
      quantity: item.quantity,
      price: item.price,
    })) : [],
    subtotal: o.subtotal,
    // Shipping isn't stored separately; derive it: total - (subtotal - discount).
    shipping: Math.max(0, (o.total ?? 0) - ((o.subtotal ?? 0) - (o.couponDiscount ?? 0))),
    discount: o.couponDiscount ?? 0,
    total: o.total,
    paymentMethod: o.paymentMethod,
    status: o.status as AdminOrder["status"],
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
    // Shipment fields from DB
    awbCode: o.awbCode ?? null,
    trackingUrl: o.trackingUrl ?? null,
    shippingProvider: o.shippingProvider ?? null,
    notes: o.notes ?? null,
    amountPaid: o.amountPaid ?? 0,
    refundedAmount: o.refundedAmount ?? 0,
    refundStatus: (o.refundStatus ?? "none") as AdminOrder["refundStatus"],
    source: o.source ?? null, // "app" | "web" — drives the channel badge
  }));

  const refresh = useCallback(() => refetch(), [refetch]);

  const tabCounts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    orders.forEach(o => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    let list = tab === "all" ? orders : orders.filter(o => o.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, tab, search]);

  const updateStatusMutation = trpc.adminOrders.updateStatus.useMutation({
    onSuccess: (_, vars) => {
      refetch();
      setPendingStatus(prev => { const n = { ...prev }; delete n[vars.id]; return n; });
      if (selected?.id === vars.id) setSelected(prev => prev ? { ...prev, status: vars.status } : null);
      toast.success(`Order #${vars.id} status updated to ${STATUS_CONFIG[vars.status]?.label}`);
    },
    onError: (err) => toast.error(`Failed to update status: ${err.message}`),
  });

  const handleStatusChange = (orderId: string, status: AdminOrder["status"]) => {
    updateStatusMutation.mutate({ id: orderId, status });
  };

  const handleSelectPending = (orderId: string, status: AdminOrder["status"]) => {
    setPendingStatus(prev => ({ ...prev, [orderId]: status }));
  };

  const handleConfirmStatus = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    const pending = pendingStatus[orderId];
    if (pending) handleStatusChange(orderId, pending);
  };

  const handleCancelPending = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    setPendingStatus(prev => { const n = { ...prev }; delete n[orderId]; return n; });
  };

  const handleShipped = () => {
    // Refetch orders to get updated shipment info from DB
    refetch();
    setShipOrderTarget(null);
  };

  // Export the currently-filtered orders to a CSV (accounting / GST friendly).
  const handleExportCSV = () => {
    if (filtered.length === 0) { toast.error("No orders to export"); return; }
    const headers = ["Order ID", "Date", "Customer", "Phone", "Email", "City", "State", "Pincode", "Items", "Subtotal", "Discount", "Shipping", "Total", "Payment", "Status"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map(o => [
      o.id,
      new Date(o.createdAt).toLocaleString("en-IN"),
      o.customerName, o.phone, o.email, o.city, o.state, o.pincode,
      o.items.reduce((s, i) => s + i.quantity, 0),
      o.subtotal, o.discount, o.shipping, o.total,
      o.paymentMethod, o.status,
    ].map(esc).join(","));
    const csv = [headers.map(esc).join(","), ...rows].join("\n");
    // Prepend a BOM so Excel reads the UTF-8 ₹/names correctly.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nutriwow-orders-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} orders`);
  };

  return (
    <AdminLayout
      title="Orders"
      subtitle={isLoading ? "Loading..." : `${orders.length} total`}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={13} /><span className="hidden sm:inline">Export CSV</span>
          </button>
          <button onClick={() => refetch()}
            className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /><span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      }
    >
      <div className="p-4 lg:p-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* Tabs */}
          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex min-w-max">
              {TABS.map(key => {
                const active = tab === key;
                const label = key === "all" ? "All" : STATUS_CONFIG[key]?.label ?? key;
                const count = tabCounts[key] || 0;
                return (
                  <button key={key} onClick={() => setTab(key)}
                    className={`flex items-center gap-2 px-4 py-3.5 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                      active ? "border-[#43A047] text-[#43A047]" : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}>
                    {label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      active ? "bg-[#43A047] text-white" : "bg-gray-100 text-gray-500"
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search orders, customers..."
                className="w-full pl-8 pr-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#43A047] bg-gray-50 transition-colors" />
            </div>
            <span className="text-[11px] text-gray-400 flex-shrink-0">{filtered.length} orders</span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  {["Order", "Customer", "Items", "Total", "Payment", "Status", "Date", ""].map((h, i) => (
                    <th key={i} className={`text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider ${
                      i === 2 ? "hidden sm:table-cell" : i === 4 ? "hidden md:table-cell" : i === 6 ? "hidden lg:table-cell" : ""
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-14 text-center">
                    <Package size={28} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-[12px] text-gray-400">No orders found</p>
                  </td></tr>
                ) : filtered.map(order => {
                  // Shipment info comes directly from DB order fields
                  const hasShipment = !!(order.awbCode);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                      onClick={() => setSelected(order)}>
                      <td className="px-4 py-3.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-semibold text-gray-900">#{order.id}</span>
                            <OrderSourceBadge source={(order as any).source} />
                          </div>
                          {hasShipment && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Truck size={9} className="text-purple-400" />
                              <span className="text-[9px] text-purple-500 font-mono">{order.awbCode}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-[12px] font-medium text-gray-800">{order.customerName}</p>
                        <p className="text-[10px] text-gray-400">{order.city}</p>
                      </td>
                      <td className="px-4 py-3.5 text-[11px] text-gray-500 hidden sm:table-cell">
                        {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-bold text-gray-900">₹{order.total.toLocaleString("en-IN")}</span>
                      </td>
                      <td className="px-4 py-3.5 text-[11px] text-gray-500 hidden md:table-cell">{order.paymentMethod}</td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={pendingStatus[order.id] ?? order.status}
                            onChange={e => handleSelectPending(order.id, e.target.value as AdminOrder["status"])}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${
                              STATUS_CONFIG[pendingStatus[order.id] ?? order.status]?.bg
                            } ${STATUS_CONFIG[pendingStatus[order.id] ?? order.status]?.border} ${STATUS_CONFIG[pendingStatus[order.id] ?? order.status]?.color}`}
                          >
                            {(Object.entries(STATUS_CONFIG) as [AdminOrder["status"], typeof STATUS_CONFIG[string]][]).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                          {pendingStatus[order.id] && pendingStatus[order.id] !== order.status && (
                            <>
                              <button
                                onClick={e => handleConfirmStatus(e, order.id)}
                                title="Confirm status change"
                                className="w-6 h-6 flex items-center justify-center rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors shadow-sm"
                              >
                                <Check size={12} strokeWidth={3} />
                              </button>
                              <button
                                onClick={e => handleCancelPending(e, order.id)}
                                title="Cancel"
                                className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 transition-colors"
                              >
                                <X size={11} strokeWidth={2.5} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <p className="text-[11px] text-gray-700 font-medium">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}</p>
                        <p className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!hasShipment && (
                            <button
                              onClick={e => { e.stopPropagation(); setShipOrderTarget(order); }}
                              title="Ship this order"
                              className="p-1.5 text-[#43A047] hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <Truck size={13} />
                            </button>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); setSelected(order); }}
                            className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && (
        <OrderDetailPanel
          order={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onShipOrder={(o) => { setSelected(null); setShipOrderTarget(o); }}
        />
      )}

      {shipOrderTarget && (
        <ShipOrderModal
          order={shipOrderTarget}
          onClose={() => setShipOrderTarget(null)}
          onShipped={handleShipped}
        />
      )}
    </AdminLayout>
  );
}
