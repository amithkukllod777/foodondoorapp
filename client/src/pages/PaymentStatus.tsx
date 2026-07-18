/**
 * PaymentStatus page
 * Handles PhonePe redirect after payment completion
 * URL: /payment-status?orderId=NW123456&total=1299&plan=full|advance30
 *
 * PhonePe flow: CartDrawer saves order to DB with "pending_payment" status → redirects to PhonePe →
 * user returns here → we check PhonePe status → if COMPLETED, confirm order (pending_payment → placed)
 */

import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { CheckCircle2, XCircle, Loader2, ShoppingBag, Home, RefreshCw, Gift } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { trackPurchase } from "@/lib/ga4";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import SEO from "@/components/SEO";

const CART_COUPON_KEY = "nutriwow_cart_coupon";

type PaymentState = "checking" | "success" | "failed" | "pending";

export default function PaymentStatus() {
  const { clearCart } = useCart();
  const [paymentState, setPaymentState] = useState<PaymentState>("checking");
  const [orderId, setOrderId] = useState("");
  const [total, setTotal] = useState(0);
  const [payNow, setPayNow] = useState(0);
  const [plan, setPlan] = useState<"full" | "advance30">("full");
  const [errorMsg, setErrorMsg] = useState("");
  const [isCod, setIsCod] = useState(false);
  const orderConfirmedRef = useRef(false); // prevent double-confirm
  const purchaseTrackedRef = useRef(false);

  // Read gift wrap info from sessionStorage (saved by CartDrawer)
  const lastOrderData = (() => {
    try {
      const stored = sessionStorage.getItem("nutriwow_last_order") || sessionStorage.getItem("nutriwow_pending_order");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  })();
  const isGiftWrapped = lastOrderData?.isGiftWrapped || false;
  const giftMessage = lastOrderData?.giftMessage || "";

  const confirmOrderMutation = trpc.customer.confirmOrder.useMutation();
  const applyReferralMutation = trpc.referral.redeem.useMutation();

  const statusQuery = trpc.payment.status.useQuery(
    { orderId },
    {
      enabled: !!orderId && paymentState !== "success",
      refetchInterval: paymentState === "checking" || paymentState === "pending" ? 3000 : false,
      retry: 3,
    }
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oid = params.get("orderId") || "";
    const tot = parseFloat(params.get("total") || "0");
    const planParam = params.get("plan") || "full";
    const statusParam = params.get("status"); // Razorpay/COD sets status=SUCCESS directly
    setOrderId(oid);
    setTotal(tot);
    const isCodPlan = planParam === "cod";
    setPlan(planParam.includes("advance") ? "advance30" : "full");
    setPayNow(isCodPlan ? 0 : (planParam.includes("advance") ? Math.round(tot * 0.30) : tot));
    setIsCod(isCodPlan);
    // Razorpay/COD: order was already saved as "placed" in CartDrawer handler, just show success
    if (statusParam === "SUCCESS") {
      orderConfirmedRef.current = true; // already confirmed
      setPaymentState("success");
    }
  }, []);

  // When PhonePe status comes back as COMPLETED, confirm the order (pending_payment → placed)
  useEffect(() => {
    if (!statusQuery.data) return;

    const state = statusQuery.data.state?.toUpperCase();

    if (state === "COMPLETED") {
      if (!orderConfirmedRef.current) {
        orderConfirmedRef.current = true;
        confirmOrder();
        // Apply referral code if present (best-effort, non-blocking)
        const refCode = localStorage.getItem("nutriwow_ref_code");
        if (refCode) {
          applyReferralMutation.mutate(
            { code: refCode },
            {
              onSettled: () => localStorage.removeItem("nutriwow_ref_code"),
            }
          );
        }
        localStorage.removeItem(CART_COUPON_KEY);
        clearCart();
      }
      setPaymentState("success");
    } else if (state === "FAILED" || state === "CANCELLED") {
      setPaymentState("failed");
      setErrorMsg("Payment was not completed. Your cart and coupon are still saved.");
    } else if (state === "PENDING") {
      setPaymentState("pending");
    }
  }, [statusQuery.data]);

  useEffect(() => {
    if (statusQuery.error) {
      setPaymentState("failed");
      setErrorMsg("Could not verify payment status. Please contact support.");
    }
  }, [statusQuery.error]);

  async function confirmOrder() {
    try {
      await confirmOrderMutation.mutateAsync({
        orderId,
        paymentId: statusQuery.data?.paymentDetails?.transactionId || statusQuery.data?.orderId || undefined,
      });
      console.log("[PaymentStatus] Order confirmed:", orderId);
      sessionStorage.removeItem("nutriwow_pending_order");
    } catch (err: any) {
      // If order is already placed, that's fine
      console.error("[PaymentStatus] Failed to confirm order:", err);
      // Don't block the success UI — payment was successful
    }
  }

  useEffect(() => {
    if (paymentState === "success" && orderId && !purchaseTrackedRef.current) {
      purchaseTrackedRef.current = true;
      try {
        const stored = sessionStorage.getItem("nutriwow_last_order");
        const orderData = stored ? JSON.parse(stored) : null;
        const orderItems = (orderData?.items as Array<{ id: number | string; name: string; price: number; quantity: number }>) ?? [];
        trackPurchase(
          orderId,
          total,
          orderItems.map((i) => ({ id: String(i.id), name: i.name, price: i.price, quantity: i.quantity })),
        );
      } catch {
        trackPurchase(orderId, total, []);
      }
    }
  }, [paymentState, orderId, total]);

  // ── Google Customer Reviews opt-in ──
  // On a successful order, hand Google the order_id + customer email so it can
  // email a post-purchase survey (the customer opts in via Google's own dialog).
  // Merchant Center acct 5608682285; program agreement already signed in Merchant Center.
  const gcrFiredRef = useRef(false);
  useEffect(() => {
    if (paymentState !== "success" || !orderId || gcrFiredRef.current) return;
    // last_order (Razorpay/COD) carries email; pending_order (PhonePe) has form.email
    const email = lastOrderData?.email || lastOrderData?.form?.email || "";
    if (!email) return; // GCR requires the customer's email
    gcrFiredRef.current = true;

    const d = new Date();
    d.setDate(d.getDate() + 6); // estimated delivery ~6 days out (matches confirmation page)
    const estimatedDelivery = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const renderOptIn = () => {
      const gapi = (window as any).gapi;
      if (!gapi) return;
      gapi.load("surveyoptin", () => {
        (window as any).gapi.surveyoptin.render({
          merchant_id: 5608682285,
          order_id: orderId,
          email,
          delivery_country: "IN",
          estimated_delivery_date: estimatedDelivery,
        });
      });
    };

    if ((window as any).gapi?.surveyoptin) {
      renderOptIn();
    } else {
      (window as any).renderOptIn = renderOptIn;
      if (!document.getElementById("gcr-platform-js")) {
        const s = document.createElement("script");
        s.id = "gcr-platform-js";
        s.src = "https://apis.google.com/js/platform.js?onload=renderOptIn";
        s.async = true;
        s.defer = true;
        document.body.appendChild(s);
      }
    }
  }, [paymentState, orderId]);

  const dueOnDelivery = plan === "advance30" ? total - payNow : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title="Payment Status | Nutriwow" description="" noIndex={true} />
      <AnnouncementBar />
      <Header />

      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="bg-card rounded-3xl shadow-clay-lg p-8 max-w-md w-full text-center">

          {/* Checking / Pending */}
          {(paymentState === "checking" || paymentState === "pending") && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-clay-green flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-nutrigreen animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Verifying Payment</h1>
              <p className="text-muted-foreground">
                {paymentState === "pending"
                  ? "Your payment is being processed. Please wait..."
                  : "Checking your payment status..."}
              </p>
              <p className="text-sm text-muted-foreground/70">Order ID: <span className="font-mono font-semibold text-muted-foreground">{orderId}</span></p>
            </div>
          )}

          {/* Success */}
          {paymentState === "success" && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-clay-green flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-nutrigreen" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">{isCod ? "Order Placed!" : "Payment Successful!"}</h1>
              <p className="text-muted-foreground">{isCod ? "Your COD order has been placed successfully." : "Your order has been placed successfully."}</p>

              <div className="bg-clay-green rounded-2xl p-4 w-full text-left mt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono font-semibold text-foreground">{orderId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{isCod ? "Order Total" : "Amount Paid"}</span>
                  <span className="font-bold text-nutrigreen">₹{(isCod ? total : payNow).toLocaleString("en-IN")}</span>
                </div>
                {isCod && (
                  <div className="flex justify-between text-sm border-t border-green-200 pt-2">
                    <span className="text-muted-foreground">Payment</span>
                    <span className="font-semibold text-orange-600">Cash on Delivery</span>
                  </div>
                )}
                {!isCod && plan === "advance30" && dueOnDelivery > 0 && (
                  <div className="flex justify-between text-sm border-t border-green-200 pt-2">
                    <span className="text-muted-foreground">Due on Delivery</span>
                    <span className="font-bold text-orange-600">₹{dueOnDelivery.toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>

              {isGiftWrapped && (
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl px-4 py-3 w-full text-left">
                  <p className="text-xs font-semibold text-purple-700 flex items-center gap-1.5"><Gift size={13} className="text-purple-500" /> Gift Wrapped</p>
                  {giftMessage && <p className="text-xs text-purple-600/80 mt-1 italic">"{giftMessage}"</p>}
                </div>
              )}

              {plan === "advance30" && (
                <div className="bg-clay-butter rounded-2xl px-4 py-3 w-full text-left">
                  <p className="text-xs text-clay-brown font-semibold">📦 Partial Payment Order</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    You paid 30% advance. Please keep ₹{dueOnDelivery.toLocaleString("en-IN")} ready for cash payment on delivery.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                <Link href="/" className="flex-1">
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-card shadow-clay-sm text-foreground font-semibold hover:bg-background transition-colors">
                    <Home className="w-4 h-4" />
                    Continue Shopping
                  </button>
                </Link>
                <Link href="/profile" className="flex-1">
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors">
                    <ShoppingBag className="w-4 h-4" />
                    My Orders
                  </button>
                </Link>
              </div>
            </div>
          )}

          {/* Failed */}
          {paymentState === "failed" && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Payment Failed</h1>
              <p className="text-muted-foreground">{errorMsg || "Something went wrong with your payment."}</p>

              {orderId && (
                <p className="text-sm text-muted-foreground/70">Order ID: <span className="font-mono font-semibold text-muted-foreground">{orderId}</span></p>
              )}

              <div className="bg-clay-butter rounded-2xl px-4 py-3 w-full text-left">
                <p className="text-xs text-orange-700 font-semibold">🛒 Your cart is saved</p>
                <p className="text-xs text-orange-600 mt-0.5">
                  Your items and coupon code are still in your cart. Click "Try Again" to retry payment.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                <Link href="/" className="flex-1">
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-card shadow-clay-sm text-foreground font-semibold hover:bg-background transition-colors">
                    <Home className="w-4 h-4" />
                    Go Home
                  </button>
                </Link>
                <Link href="/checkout" className="flex-1">
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
