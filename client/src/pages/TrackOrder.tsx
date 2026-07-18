/**
 * Nutriwow - Order Tracking Page
 * Customers can track their order by Order ID or AWB number
 * Supports ?orderId=NW-XXXX URL query param for deep-link from email
 */

import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { Package, Search, Truck, MapPin, Phone, FileDown } from "lucide-react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import OrderTimeline from "@/components/OrderTimeline";
import { trpc } from "@/lib/trpc";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  placed: "Order Placed",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export default function TrackOrder() {
  const searchString = useSearch(); // returns "?orderId=NW-123" or ""
  const [orderId, setOrderId] = useState("");
  const [searchId, setSearchId] = useState<string | null>(null);

  // Strip leading # from order ID (users sometimes copy "#NW123" from order pages)
  const normalizeOrderId = (id: string) => id.trim().replace(/^#+/, "").toUpperCase();

  // Auto-fill and auto-submit if ?orderId= is present in URL (e.g. from email button)
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const urlOrderId = params.get("orderId");
    if (urlOrderId && urlOrderId.trim()) {
      const normalized = normalizeOrderId(urlOrderId);
      setOrderId(normalized);
      setSearchId(normalized);
    }
  }, [searchString]);

  const { data: order, isLoading, error } = trpc.orderTracking.track.useQuery(
    { orderId: searchId! },
    { enabled: !!searchId }
  );

  const invoiceMutation = trpc.customer.getInvoiceUrl.useMutation({
    onSuccess: ({ url }: { url: string }) => {
      if (url) window.open(url, "_blank", "noopener");
    },
    onError: (err: { message?: string }) => {
      alert(err.message || "Could not generate invoice. Please try again.");
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderId.trim()) {
      const normalized = normalizeOrderId(orderId);
      setOrderId(normalized); // also update input to show clean value
      setSearchId(normalized);
    }
  };

  const orderItems = (() => {
    try {
      return typeof order?.items === "string" ? JSON.parse(order.items) : order?.items || [];
    } catch {
      return [];
    }
  })();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title="Track Your Order" description="Track your Nutriwow order status and delivery." noIndex />
      <AnnouncementBar />
      <Header />

      <main className="flex-1 py-10">
        <div className="container max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-clay-peach rounded-full shadow-clay-sm mb-4">
              <Truck size={32} className="text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Track Your Order
            </h1>
            <p className="text-muted-foreground text-sm">Enter your Order ID to get real-time tracking updates</p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="bg-card rounded-3xl shadow-clay p-6 mb-6">
            <label className="block text-sm font-semibold text-foreground mb-2">Order ID</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. NW762683"
                className="flex-1 border-0 bg-background shadow-clay-pressed rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 uppercase"
              />
              <button
                type="submit"
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed text-sm  transition-colors"
              >
                <Search size={16} />
                Track
              </button>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-2">
              You can find your Order ID in your order confirmation SMS or in the "My Orders" section of your profile.
            </p>
          </form>

          {/* Loading */}
          {isLoading && (
            <div className="bg-card rounded-3xl shadow-clay p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Fetching your order details...</p>
            </div>
          )}

          {/* Error / Not Found */}
          {error && (
            <div className="bg-red-50 rounded-3xl shadow-clay-sm p-6 text-center">
              <Package size={32} className="text-red-400 mx-auto mb-2" />
              <p className="font-semibold text-red-700 mb-1">Order Not Found</p>
              <p className="text-sm text-red-500">
                We couldn't find an order with ID "{searchId}". Please check the ID and try again.
              </p>
            </div>
          )}

          {/* Order Found */}
          {order && !isLoading && (
            <div className="space-y-4">
              {/* Order Summary Card */}
              <div className="bg-card rounded-3xl shadow-clay p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Order ID</p>
                    <p className="text-lg font-bold text-foreground">{order.id}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    ((s) =>
                      s === "delivered" ? "bg-clay-green text-nutrigreen" :
                      s === "shipped" || s === "out_for_delivery" ? "bg-clay-butter text-clay-brown" :
                      s === "cancelled" ? "bg-red-100 text-red-700" :
                      s === "returned" ? "bg-orange-100 text-orange-700" :
                      "bg-clay-peach text-clay-brown"
                    )(order.status as string)
                  }`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>

                {/* Tracking Progress — visual timeline */}
                <div className="mb-6">
                  <OrderTimeline status={order.status} />
                </div>

                {/* AWB / Tracking Info */}
                {order.awbCode && (
                  <div className="bg-clay-butter rounded-2xl px-4 py-3 mb-4">
                    <p className="text-xs font-semibold text-clay-brown mb-0.5">Tracking Number (AWB)</p>
                    <p className="font-bold text-clay-brown">{order.awbCode}</p>
                    {order.trackingUrl && (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline mt-1 inline-block"
                      >
                        Track on courier website →
                      </a>
                    )}
                    {order.shippingProvider && (
                      <p className="text-xs text-clay-brown/70 mt-0.5">via {order.shippingProvider}</p>
                    )}
                  </div>
                )}

                {/* Delivery Address */}
                <div className="flex items-start gap-3 bg-muted rounded-2xl px-4 py-3 mb-4">
                  <MapPin size={16} className="text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">{order.address}, {order.city}, {order.state} - {order.pincode}</p>
                  </div>
                </div>

                {/* Order Items */}
                {orderItems.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Items Ordered</p>
                    <div className="space-y-2">
                      {orderItems.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 bg-muted rounded-xl px-3 py-2">
                          {item.image && (
                            <img src={item.image} alt={item.name} className="w-10 h-10 object-contain rounded" loading="lazy" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground line-clamp-1">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">Qty: {item.quantity || 1}</p>
                          </div>
                          <p className="text-xs font-bold text-foreground">₹{item.price}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Order Total */}
                <div className="border-t border-border mt-4 pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Payment: {order.paymentMethod}</p>
                    <p className="text-xs text-muted-foreground">
                      Ordered on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-bold text-foreground">₹{order.total}</p>
                  </div>
                </div>

                {/* Download GST Invoice */}
                <button
                  type="button"
                  onClick={() => invoiceMutation.mutate({ orderId: order.id })}
                  disabled={invoiceMutation.isPending}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border border-nutrigreen/30 bg-clay-green px-4 py-2.5 text-sm font-semibold text-nutrigreen shadow-clay-sm active:translate-y-0.5 disabled:opacity-60 transition-all"
                >
                  <FileDown size={16} />
                  {invoiceMutation.isPending ? "Preparing invoice…" : "Download Invoice (PDF)"}
                </button>
              </div>

              {/* Help Card */}
              <div className="bg-clay-green rounded-2xl p-5 flex items-center gap-4">
                <Phone size={24} className="text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-nutrigreen">Need Help?</p>
                  <p className="text-xs text-nutrigreen">
                    Contact us at{" "}
                    <a href="mailto:wecare@nutriwow.in" className="underline font-medium">wecare@nutriwow.in</a>
                    {" "}or WhatsApp us with your Order ID.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <CartDrawer />
    </div>
  );
}
