/*
 * Nutriwow Clone - Order Confirmation Page
 * Design: Vibrant Indian Grocery Modern
 */


import { useState } from "react";
import { Link, useSearch } from "wouter";
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Home,
  ShoppingBag,
  Copy,
  Check,
  Gift,
  Share2,
  Users,
  FileText,
} from "lucide-react";

import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { openGSTInvoice } from "@/components/GSTInvoice";

function ReferralCard() {
  const { user, isLoggedIn } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: referralData } = trpc.referral.getMyCode.useQuery(undefined, {
    enabled: isLoggedIn && !!user?.customerId,
  });

  if (!isLoggedIn || !referralData) {
    return (
      <div className="bg-nutriorange rounded-2xl px-5 py-4 text-white text-center">
        <p className="text-sm font-bold mb-1">
          Share with friends & earn rewards!
        </p>
        <p className="text-xs opacity-80">
          Login to get your referral code and earn Rs. 50 off
        </p>
      </div>
    );
  }

  const shareMsg = `Hey! Use my code ${referralData.code} to shop premium dry fruits on Nutriwow and get great deals! https://www.nutriwow.in?ref=${referralData.code}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMsg)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralData.code);
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-r from-nutrigreen/10 to-emerald-50 rounded-2xl p-5 shadow-clay">
      <div className="flex items-center gap-2 mb-3">
        <Gift size={20} className="text-nutrigreen" />
        <h3 className="text-sm font-bold text-foreground">Refer a Friend, Get Rs. 50 off!</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Share your code with friends. When they order, you get a Rs. 50 coupon!
      </p>
      <div className="flex items-center gap-2 mb-3">
        <div className="font-mono text-lg font-bold tracking-wider bg-card px-4 py-2 rounded-xl shadow-clay-pressed flex-1 text-center text-foreground">
          {referralData.code}
        </div>
        <button
          onClick={handleCopy}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-card shadow-clay-sm hover:shadow-clay active:translate-y-0.5 active:shadow-clay-pressed transition-all"
        >
          {copied ? <Check size={16} className="text-nutrigreen" /> : <Copy size={16} className="text-muted-foreground" />}
        </button>
      </div>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white text-sm font-semibold active:translate-y-0.5 transition-all"
        style={{ backgroundColor: "#25D366" }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.591-.813-6.348-2.18l-.442-.352-3.276 1.098 1.098-3.276-.352-.442A9.935 9.935 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
        Share via WhatsApp
      </a>
    </div>
  );
}

function GSTInvoiceButton({ orderId }: { orderId: string }) {
  const invoiceQuery = trpc.customer.getGSTInvoice.useQuery(
    { orderId },
    { enabled: !!orderId && orderId !== "NW000000", retry: false }
  );

  return (
    <button
      onClick={() => {
        if (invoiceQuery.data) {
          openGSTInvoice(invoiceQuery.data as any);
        } else {
          window.print();
        }
      }}
      disabled={invoiceQuery.isLoading}
      className="flex-1 flex items-center justify-center gap-2 bg-card text-foreground py-3 rounded-full font-bold text-sm shadow-clay-sm active:translate-y-0.5 active:shadow-clay-pressed transition-all disabled:opacity-50"
    >
      <FileText size={16} />
      {invoiceQuery.isLoading ? "Loading..." : "GST Invoice"}
    </button>
  );
}

export default function OrderConfirmation() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const orderId = params.get("orderId") || "NW000000";
  const total = params.get("total") || "0";

  // Read ordered items from sessionStorage (saved before cart was cleared)
  const lastOrder = (() => {
    try {
      const stored = sessionStorage.getItem("nutriwow_last_order");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  })();
  const items = lastOrder?.items || [];
  const customerName = lastOrder?.customerName || lastOrder?.name || "";
  const customerAddress = lastOrder?.address || "";
  const isGiftWrapped = lastOrder?.isGiftWrapped || false;
  const giftMessage = lastOrder?.giftMessage || "";

  // Order date
  const orderDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Estimated delivery date (5-7 days from now)
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 6);
  const deliveryStr = deliveryDate.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const steps = [
    { icon: CheckCircle2, label: "Order Placed", done: true },
    { icon: Package, label: "Processing", done: false },
    { icon: Truck, label: "Shipped", done: false },
    { icon: MapPin, label: "Out for Delivery", done: false },
    { icon: Home, label: "Delivered", done: false },
  ];

  // Compute subtotal from items
  const subtotal = items.reduce(
    (sum: number, item: any) => sum + item.price * item.quantity,
    0
  );
  const totalNum = parseFloat(total);
  const shipping = totalNum > 0 && totalNum > subtotal ? totalNum - subtotal : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title="Order Confirmed | Nutriwow" description="" noIndex={true} />
      <div data-print="hide"><AnnouncementBar /></div>
      <div data-print="hide"><Header /></div>

      <main className="flex-1 py-8">
        <div className="container max-w-2xl">
          {/* Success Card */}
          <div className="bg-card rounded-3xl shadow-clay overflow-hidden mb-5" data-print="hide">
            {/* Green Header */}
            <div className="bg-nutrigreen rounded-t-3xl px-6 py-8 text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={36} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-1">Order Placed!</h1>
              <p className="text-sm opacity-90">
                Thank you for shopping with Nutriwow
              </p>
            </div>

            <div className="px-6 py-5">
              {/* Order Details */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-muted rounded-2xl p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Order ID</p>
                  <p className="text-sm font-bold text-foreground">#{orderId}</p>
                </div>
                <div className="bg-muted rounded-2xl p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Amount Paid</p>
                  <p className="text-sm font-bold text-nutrigreen">
                    Rs. {parseFloat(total).toFixed(2)}
                  </p>
                </div>
                <div className="bg-muted rounded-2xl p-3 col-span-2">
                  <p className="text-[10px] text-muted-foreground mb-0.5">
                    Estimated Delivery
                  </p>
                  <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Truck size={14} className="text-nutrigreen" />
                    {deliveryStr}
                  </p>
                </div>
              </div>

              {/* Order Tracking Steps */}
              <div className="mb-5" data-print="hide">
                <h3 className="text-sm font-bold text-foreground mb-4">
                  Order Status
                </h3>
                <div className="relative">
                  {/* Progress line */}
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-muted" />
                  <div
                    className="absolute top-4 left-4 h-0.5 bg-nutrigreen transition-all"
                    style={{ width: "5%" }}
                  />

                  <div className="flex justify-between relative">
                    {steps.map((step, i) => (
                      <div
                        key={step.label}
                        className="flex flex-col items-center gap-2 w-[18%]"
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                            step.done
                              ? "bg-nutrigreen text-white"
                              : "bg-muted border-0 shadow-clay-pressed text-muted-foreground"
                          }`}
                        >
                          <step.icon size={14} />
                        </div>
                        <span
                          className={`text-[9px] font-medium text-center leading-tight ${
                            step.done ? "text-nutrigreen" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Items ordered */}
              {items.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-bold text-foreground mb-3">
                    Items Ordered
                  </h3>
                  <div className="space-y-2">
                    {items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 bg-muted rounded-2xl p-3"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12 object-contain rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground line-clamp-1">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70">
                            {item.weight} × {item.quantity}
                          </p>
                        </div>
                        <p className="text-xs font-bold text-foreground">
                          ₹{(item.price * item.quantity).toFixed(0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gift wrap badge */}
              {isGiftWrapped && (
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-3 mb-5">
                  <p className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
                    <Gift size={13} className="text-purple-500" /> Gift Wrapped
                  </p>
                  {giftMessage && (
                    <p className="text-xs text-purple-600/80 mt-1 italic">"{giftMessage}"</p>
                  )}
                </div>
              )}

              {/* Info note */}
              <div className="bg-clay-butter rounded-2xl p-3 mb-5">
                <p className="text-xs text-clay-brown leading-relaxed">
                  📧 A confirmation email has been sent to your registered email
                  address. You can track your order using the Order ID above.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3" data-print="hide">
                <Link
                  href="/"
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-full font-bold text-sm shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all"
                >
                  <ShoppingBag size={16} />
                  Continue Shopping
                </Link>
                <GSTInvoiceButton orderId={orderId} />
              </div>
            </div>
          </div>

          {/* Referral Card */}
          <div data-print="hide">
            <ReferralCard />
          </div>

          {/* ── Print-only Invoice ── */}
          <div className="print-invoice" style={{ fontFamily: "'Poppins', sans-serif", color: "#222", fontSize: "13px", lineHeight: 1.5 }}>
            {/* Invoice Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #222", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <img src="/logo.png" alt="Nutriwow" style={{ height: "40px", marginBottom: "6px" }} />
                <p style={{ fontWeight: 700, fontSize: "14px", margin: 0 }}>Foodondoor Private Limited</p>
                <p style={{ margin: 0, fontSize: "12px" }}>FSSAI: 11424999000246</p>
                <p style={{ margin: 0, fontSize: "12px" }}>Sherpur Square, Sehore, MP - 466001</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, letterSpacing: "1px" }}>TAX INVOICE</h2>
              </div>
            </div>

            {/* Order meta */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "13px" }}>
              <div>
                <p style={{ margin: 0 }}><strong>Order:</strong> #{orderId}</p>
                <p style={{ margin: 0 }}><strong>Date:</strong> {orderDate}</p>
              </div>
              {customerName && (
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0 }}><strong>Bill To:</strong></p>
                  <p style={{ margin: 0 }}>{customerName}</p>
                  {customerAddress && <p style={{ margin: 0, fontSize: "11px" }}>{customerAddress}</p>}
                </div>
              )}
            </div>

            {/* Items table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #222" }}>
                  <th style={{ textAlign: "left", padding: "6px 4px", width: "30px" }}>#</th>
                  <th style={{ textAlign: "left", padding: "6px 4px" }}>Item</th>
                  <th style={{ textAlign: "center", padding: "6px 4px", width: "50px" }}>Qty</th>
                  <th style={{ textAlign: "right", padding: "6px 4px", width: "80px" }}>Price</th>
                  <th style={{ textAlign: "right", padding: "6px 4px", width: "80px" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? items.map((item: any, idx: number) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "6px 4px" }}>{idx + 1}</td>
                    <td style={{ padding: "6px 4px" }}>
                      {item.name}
                      {item.weight && <span style={{ fontSize: "11px", color: "#666" }}> ({item.weight})</span>}
                    </td>
                    <td style={{ textAlign: "center", padding: "6px 4px" }}>{item.quantity}</td>
                    <td style={{ textAlign: "right", padding: "6px 4px" }}>&#8377;{item.price.toFixed(0)}</td>
                    <td style={{ textAlign: "right", padding: "6px 4px" }}>&#8377;{(item.price * item.quantity).toFixed(0)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} style={{ padding: "12px 4px", textAlign: "center", color: "#999" }}>
                      Item details not available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
              <div style={{ width: "220px", fontSize: "13px" }}>
                {items.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #ddd" }}>
                    <span>Subtotal:</span>
                    <span>&#8377;{subtotal.toFixed(0)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #ddd" }}>
                  <span>Shipping:</span>
                  <span>{shipping > 0 ? `₹${shipping.toFixed(0)}` : "Free"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontWeight: 700, fontSize: "15px", borderTop: "2px solid #222" }}>
                  <span>Total:</span>
                  <span>&#8377;{totalNum.toFixed(0)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: "1px solid #ccc", paddingTop: "12px", textAlign: "center", fontSize: "11px", color: "#666" }}>
              <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#222" }}>Thank you for shopping with Nutriwow!</p>
              <p style={{ margin: 0 }}>Contact: wecare@nutriwow.in | +91 95463 34633</p>
              <p style={{ margin: 0 }}>www.nutriwow.in</p>
            </div>
          </div>
        </div>
      </main>

      <div data-print="hide"><Footer /></div>
    </div>
  );
}
