/*
 * CartDrawer — 3-step inline checkout sidebar
 * Step 1: Cart + Coupon
 * Step 2: Address (DB-backed for logged-in users)
 * Step 3: Payment
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  X, Minus, Plus, ShoppingBag, Truck, Tag, ChevronUp, ChevronDown,
  Trash2, MapPin, Plus as PlusIcon, ChevronLeft, CheckCircle2,
  CreditCard, Smartphone, Banknote, Check, Info, Sparkles, Star, Gift,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { optImg } from "@/lib/img";
import { toast } from "sonner";
import { useFacebookCapi } from "@/hooks/useFacebookCapi";
import { dbProductToFrontend } from "@/lib/products";
import { getBulkDiscount, getBulkPrice, getBulkSavings, computeShipping, GIFT_WRAP_FEE } from "@shared/pricing";
import { trackBeginCheckout } from "@/lib/ga4";
import { getStoredUtm } from "@/hooks/useUtm";

// ─── Constants ────────────────────────────────────────────────────────────────

const MILESTONES = [
  { threshold: 899, label: "Extra 10% OFF", couponCode: "SUPERSAVER10", icon: "🏷️" },
  { threshold: 1499, label: "Extra 12% OFF", couponCode: "SUPERSAVER12", icon: "🎁" },
];

// Milestone coupon codes that auto-apply
const MILESTONE_COUPON_CODES = MILESTONES.map(m => m.couponCode);

const CART_COUPON_KEY = "nutriwow_cart_coupon";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir",
  "Ladakh","Puducherry","Chandigarh","Andaman & Nicobar Islands","Lakshadweep",
  "Dadra & Nagar Haveli and Daman & Diu",
];

// Coupon validation is now DB-backed via trpc.coupons.validate

type Step = 1 | 2 | 3;
type PaymentPlan = "phonepe_full" | "phonepe_advance30" | "razorpay_full" | "razorpay_advance30" | "cod";

// Declare Razorpay global from checkout.js script
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CartDrawer() {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, totalPrice, clearCart, addToCart } = useCart();
  const { user, isLoggedIn, addAddress, setIsLoginOpen, setAddresses } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [orderNote, setOrderNote] = useState("");

  // ── Coupon state ──
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string; discount: number; type: "percent" | "flat"; label: string
  } | null>(() => {
    try {
      const saved = localStorage.getItem(CART_COUPON_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [showCouponList, setShowCouponList] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [expandedCoupon, setExpandedCoupon] = useState<string | null>(null);
  const prevMilestoneRef = useRef<number>(0); // track previously achieved milestone count

  // ── Address state ──
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);
  const [addrForm, setAddrForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    address: "", city: "", state: "", pincode: "",
  });

  // ── Payment state ──
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("phonepe_full");
  const [placing, setPlacing] = useState(false);

  // ── Gift wrap state ── (GIFT_WRAP_FEE imported from @shared/pricing so the
  // client display and the server charge stay in lockstep)
  const [isGiftWrapped, setIsGiftWrapped] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");

  // ── tRPC mutations & queries ──
  const initiatePhonePe = trpc.payment.initiate.useMutation();
  const initiateRazorpay = trpc.payment.initiateRazorpay.useMutation();
  const verifyRazorpay = trpc.payment.verifyRazorpay.useMutation();
  const confirmOrderMutation = trpc.customer.confirmOrder.useMutation();
  const { data: activeGateways } = trpc.payment.getActiveGateways.useQuery();

  useEffect(() => {
    if (!activeGateways) return;
    if (activeGateways.phonepe !== false) return;
    if (activeGateways.razorpay !== false) { setPaymentPlan("razorpay_full"); return; }
    setPaymentPlan("cod");
  }, [activeGateways]);
  const addAddressMutation = trpc.customer.addAddress.useMutation();
  const placeOrderMutation = trpc.customer.placeOrder.useMutation();
  const applyReferralMutation = trpc.referral.redeem.useMutation();
  const validateCouponMutation = trpc.coupons.validate.useMutation();
  const logCartEventMutation = trpc.analytics.logCartEvent.useMutation();

  // ── Cart funnel session ID ──
  const cartSessionId = useMemo(() => {
    let sid = sessionStorage.getItem("nw_cart_sid");
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem("nw_cart_sid", sid);
    }
    return sid;
  }, []);

  const fireCartEvent = useCallback((event: string, productId?: number) => {
    try {
      logCartEventMutation.mutate({
        sessionId: cartSessionId,
        event: event as any,
        customerId: user?.customerId,
        productId,
        cartValue: totalPrice,
      });
    } catch { /* fire-and-forget */ }
  }, [cartSessionId, user?.customerId, totalPrice]);

  // ── Storefront settings (e.g. minimum order value) ──
  const { data: publicSettings } = trpc.settings.getPublic.useQuery();

  // ── Available coupons from DB ──
  // Storefront shows only the FEATURED (publicly-advertised) coupons. getAll is
  // admin-only — exposing it here would leak every coupon code (incl. referral
  // rewards). Customers can still type any legitimate code; validate handles it.
  const { data: dbCoupons = [] } = trpc.coupons.getFeatured.useQuery();
  const availableCoupons = dbCoupons.map((c) => ({
    code: c.code,
    discount: c.discountValue,
    type: c.discountType as "percent" | "flat",
    minOrder: c.minOrderAmount,
    label: c.discountType === "percent" ? `Save ${c.discountValue}%` : `Save ₹${c.discountValue}`,
  }));

  // ── Product recommendations ──
  const cartProductIds = useMemo(() => items.map(i => i.id), [items]);
  const { data: recommendedDbProducts = [] } = trpc.products.recommendations.useQuery(
    { productIds: cartProductIds, limit: 4 },
    { enabled: items.length > 0 && step === 1 },
  );
  const recommendedProducts = useMemo(
    () => recommendedDbProducts.map((p: any) => dbProductToFrontend(p)),
    [recommendedDbProducts],
  );

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  // ── MRP-based savings ──
  const mrpTotal = items.reduce((s, i) => s + (i.originalPrice || i.price) * i.quantity, 0);
  const productDiscount = mrpTotal - totalPrice; // MRP discount (product-level)

  // ── Bulk / quantity discount ──
  const bulkDiscountTotal = useMemo(
    () => items.reduce((s, i) => s + getBulkSavings(i.price, i.quantity), 0),
    [items]
  );
  const totalPriceAfterBulk = totalPrice - bulkDiscountTotal;

  // ── Coupon calculations ──
  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === "percent") return Math.round(totalPriceAfterBulk * appliedCoupon.discount / 100);
    return appliedCoupon.discount;
  }, [appliedCoupon, totalPriceAfterBulk]);

  // ── Loyalty points redemption ──
  const { data: loyaltyBalance } = trpc.loyalty.getBalance.useQuery(undefined, { enabled: isLoggedIn });
  const { data: loyaltyRules } = trpc.loyalty.getRules.useQuery();
  const [useLoyalty, setUseLoyalty] = useState(false);
  const perDisc = loyaltyRules?.POINTS_PER_DISCOUNT ?? 10;
  const minRedeem = loyaltyRules?.MIN_REDEMPTION ?? 100;
  const maxRedeem = loyaltyRules?.MAX_REDEMPTION_PER_ORDER ?? 500;
  const loyaltyBalancePts = loyaltyBalance?.balance ?? 0;
  const canRedeemLoyalty = isLoggedIn && loyaltyBalancePts >= minRedeem;
  // Discount is capped to goods value (after coupon) and to the max per order.
  const loyaltyDiscount = useLoyalty && canRedeemLoyalty
    ? Math.min(
        Math.floor(Math.min(loyaltyBalancePts, maxRedeem) / perDisc),
        Math.max(0, totalPriceAfterBulk - couponDiscount),
      )
    : 0;
  const redeemPointsToSend = loyaltyDiscount > 0 ? loyaltyDiscount * perDisc : 0;

  const giftWrapCharge = isGiftWrapped ? GIFT_WRAP_FEE : 0;
  // Prepaid/online-payment discount (admin: Settings → Checkout). Applies to any
  // online plan (not COD); mirrors the server so displayed total == charged total.
  const prepaidPct = Math.max(0, Math.min(50, Number((publicSettings as { checkout?: { prepaidDiscountPercent?: string | number } } | undefined)?.checkout?.prepaidDiscountPercent) || 0));
  const goodsAfterLoyalty = Math.max(0, totalPriceAfterBulk - couponDiscount - loyaltyDiscount);
  const prepaidDiscount = (paymentPlan !== "cod" && prepaidPct > 0) ? Math.round(goodsAfterLoyalty * prepaidPct / 100) : 0;
  const goodsTotal = Math.max(0, goodsAfterLoyalty - prepaidDiscount + giftWrapCharge);
  // ── Shipping (admin: Settings → Shipping) — free above threshold, flat fee below ──
  const shippingCfg = (publicSettings as { shipping?: { fee?: number; freeAbove?: number } } | undefined)?.shipping ?? { fee: 49, freeAbove: 499 };
  const shippingFee = computeShipping(goodsTotal, { fee: Number(shippingCfg.fee) || 0, freeAbove: Number(shippingCfg.freeAbove) || 0 });
  const finalTotal = goodsTotal + shippingFee;
  const totalSavings = productDiscount + bulkDiscountTotal + couponDiscount + loyaltyDiscount + prepaidDiscount;

  // ── Checkout settings (admin: Settings → Checkout) ──
  const checkoutCfg = (publicSettings as { checkout?: { minOrderValue?: string | number; orderNotes?: boolean; termsRequired?: boolean } } | undefined)?.checkout;
  const minOrder = Math.max(0, Number(checkoutCfg?.minOrderValue) || 0);
  const belowMin = minOrder > 0 && totalPrice < minOrder;
  const minShortfall = belowMin ? minOrder - totalPrice : 0;
  const termsRequired = checkoutCfg?.termsRequired === true;
  const showOrderNotes = checkoutCfg?.orderNotes !== false;
  const advanceAmount = Math.round(finalTotal * 0.30);
  const isAdvancePlan = paymentPlan === "phonepe_advance30" || paymentPlan === "razorpay_advance30";
  const payNowAmount = isAdvancePlan ? advanceAmount : finalTotal;

  // ── Milestone progress ──
  const nextMilestone = MILESTONES.find(m => totalPrice < m.threshold);
  const achievedMilestones = MILESTONES.filter(m => totalPrice >= m.threshold);
  const highestMilestone = achievedMilestones[achievedMilestones.length - 1] || null;
  const milestoneProgress = nextMilestone
    ? Math.min(100, (totalPrice / nextMilestone.threshold) * 100)
    : 100;
  const amountToNext = nextMilestone ? nextMilestone.threshold - totalPrice : 0;

  // ── Best coupon suggestion (for when no coupon is applied) ──
  const bestCouponSuggestion = useMemo(() => {
    if (appliedCoupon) return null;
    let best: { code: string; savings: number; discount: number; type: "percent" | "flat"; minOrder: number } | null = null;
    for (const c of availableCoupons) {
      if (totalPrice < c.minOrder) continue;
      const savings = c.type === "percent" ? Math.round(totalPrice * c.discount / 100) : c.discount;
      if (!best || savings > best.savings) {
        best = { code: c.code, savings, discount: c.discount, type: c.type, minOrder: c.minOrder };
      }
    }
    return best;
  }, [appliedCoupon, availableCoupons, totalPrice]);

  // ── Auto-apply milestone coupon ──
  useEffect(() => {
    if (!isCartOpen || items.length === 0) return;
    const currentAchievedCount = achievedMilestones.length;
    // Only auto-apply when a NEW milestone is achieved (count increased)
    if (currentAchievedCount > prevMilestoneRef.current && highestMilestone) {
      const milestoneCoupon = availableCoupons.find(
        c => c.code === highestMilestone.couponCode
      );
      if (milestoneCoupon) {
        // Auto-apply the milestone coupon
        const applied = {
          code: milestoneCoupon.code,
          discount: milestoneCoupon.discount,
          type: milestoneCoupon.type,
          label: `Save ${milestoneCoupon.discount}%`,
        };
        setAppliedCoupon(applied);
        localStorage.setItem(CART_COUPON_KEY, JSON.stringify(applied));
        // Show confetti
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        toast.success(`${highestMilestone.label} unlocked! ${milestoneCoupon.code} applied automatically.`);
      }
    }
    prevMilestoneRef.current = currentAchievedCount;
  }, [achievedMilestones.length, isCartOpen, items.length, highestMilestone, availableCoupons]);

  // ── Remove milestone coupon if cart drops below threshold ──
  useEffect(() => {
    if (!appliedCoupon) return;
    if (MILESTONE_COUPON_CODES.includes(appliedCoupon.code)) {
      const milestone = MILESTONES.find(m => m.couponCode === appliedCoupon.code);
      if (milestone && totalPrice < milestone.threshold) {
        // Cart dropped below milestone, remove auto-applied coupon
        setAppliedCoupon(null);
        localStorage.removeItem(CART_COUPON_KEY);
        toast.info(`Cart below ₹${milestone.threshold}. ${appliedCoupon.code} removed.`);
      }
    }
  }, [totalPrice, appliedCoupon]);

  // ── Pre-fill address from user profile ──
  useEffect(() => {
    if (isLoggedIn && user) {
      const nameParts = (user.name || "").split(" ");
      setAddrForm(prev => ({
        ...prev,
        firstName: nameParts[0] || prev.firstName,
        lastName: nameParts.slice(1).join(" ") || prev.lastName,
        email: user.email || prev.email,
        phone: user.mobile || prev.phone,
      }));
      const defaultAddr = user.addresses.find(a => a.isDefault) || user.addresses[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        setShowAddressForm(false);
      } else {
        setShowAddressForm(true);
      }
    } else {
      setShowAddressForm(true);
    }
  }, [isLoggedIn, user?.mobile]);

  // Fill form when saved address selected
  useEffect(() => {
    if (selectedAddressId !== null && user) {
      const addr = user.addresses.find(a => a.id === selectedAddressId);
      if (addr) {
        const nameParts = addr.name.split(" ");
        setAddrForm(prev => ({
          ...prev,
          firstName: nameParts[0] || prev.firstName,
          lastName: nameParts.slice(1).join(" ") || prev.lastName,
          phone: addr.phone || prev.phone,
          address: `${addr.flat}${addr.area ? ", " + addr.area : ""}`,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
        }));
      }
    }
  }, [selectedAddressId]);

  // Track add_to_cart via custom event from CartContext
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      fireCartEvent('add_to_cart', detail?.productId);
    };
    window.addEventListener("nw:add_to_cart", handler);
    return () => window.removeEventListener("nw:add_to_cart", handler);
  }, [fireCartEvent]);

  // Log view_cart when drawer opens with items
  useEffect(() => {
    if (isCartOpen && items.length > 0) fireCartEvent('view_cart');
  }, [isCartOpen]);

  // Reset to step 1 when drawer closes
  useEffect(() => {
    if (!isCartOpen) setTimeout(() => setStep(1), 300);
  }, [isCartOpen]);

  // ── Coupon helpers ──
  const applyCouponByCode = async (code: string) => {
    const trimmedCode = code.toUpperCase().trim();
    if (!trimmedCode) return;
    try {
      const result = await validateCouponMutation.mutateAsync({ code: trimmedCode, cartTotal: totalPrice });
      if (!result.valid) {
        setCouponError(result.message);
        return;
      }
      const couponData = dbCoupons.find((c) => c.code === trimmedCode);
      const applied = {
        code: trimmedCode,
        discount: couponData?.discountValue || 0,
        type: (couponData?.discountType || "flat") as "percent" | "flat",
        label: result.message,
      };
      setAppliedCoupon(applied);
      localStorage.setItem(CART_COUPON_KEY, JSON.stringify(applied));
      setCouponError("");
      setCouponInput("");
      setShowCouponList(false);
      toast.success(result.message);
    } catch (e: any) {
      setCouponError(e.message || "Failed to validate coupon");
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    localStorage.removeItem(CART_COUPON_KEY);
  };

  // ── Address validation ──
  const validateAddress = () => {
    if (!showAddressForm && selectedAddressId !== null) return true;
    const required = ["firstName", "phone", "address", "city", "pincode"];
    for (const field of required) {
      if (!addrForm[field as keyof typeof addrForm].trim()) {
        toast.error(`Please fill in ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`);
        return false;
      }
    }
    if (!/^\d{10}$/.test(addrForm.phone)) { toast.error("Please enter a valid 10-digit phone number"); return false; }
    if (!/^\d{6}$/.test(addrForm.pincode)) { toast.error("Please enter a valid 6-digit pincode"); return false; }
    return true;
  };

  const fbCapi = useFacebookCapi();
  const handleProceedToAddress = () => {
    if (items.length === 0) return;
    // Enforce minimum order value if the admin has set one
    if (belowMin) return;
    // Require login before proceeding to address/checkout
    if (!isLoggedIn) {
      setIsCartOpen(false);
      setIsLoginOpen(true);
      return;
    }
    fbCapi.trackInitiateCheckout({
      cartTotal: finalTotal,
      productIds: items.map(i => String(i.id)),
      numItems: items.reduce((sum, i) => sum + i.quantity, 0),
    });
    fireCartEvent('start_checkout');
    trackBeginCheckout(
      items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, category: (i as any).category })),
      finalTotal,
      appliedCoupon?.code,
    );
    setStep(2);
  };

  const handleProceedToPayment = async () => {
    if (!validateAddress()) return;

    // Save address to DB if logged in and form shown
    if (isLoggedIn && user && showAddressForm && saveAddressToProfile) {
      try {
        const nameParts = [addrForm.firstName, addrForm.lastName].filter(Boolean);
        const addressParts = addrForm.address.split(",");
        const newAddr = await addAddressMutation.mutateAsync({
          name: nameParts.join(" ") || user.name || "User",
          phone: addrForm.phone,
          flat: addressParts[0]?.trim() || addrForm.address,
          area: addressParts.slice(1).join(",").trim() || "",
          city: addrForm.city,
          state: addrForm.state,
          pincode: addrForm.pincode,
          isDefault: user.addresses.length === 0,
        });
        if (newAddr) {
          addAddress(newAddr as any);
          setSelectedAddressId(newAddr.id);
          setShowAddressForm(false);
        }
      } catch (err) {
        console.error("Failed to save address:", err);
        // Continue anyway
      }
    }
    fireCartEvent('enter_address');
    setStep(3);
  };

  // Apply referral code from localStorage after a successful order (best-effort, non-blocking)
  const tryApplyReferral = () => {
    const refCode = localStorage.getItem("nutriwow_ref_code");
    if (refCode) {
      applyReferralMutation.mutate(
        { code: refCode },
        {
          onSuccess: () => localStorage.removeItem("nutriwow_ref_code"),
          onError: () => localStorage.removeItem("nutriwow_ref_code"),
        }
      );
    }
  };

  // Log select_payment when step 3 is reached
  useEffect(() => {
    if (step === 3) fireCartEvent('select_payment');
  }, [step]);

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    if (termsRequired && !agreedTerms) {
      toast.error("Please accept the Terms & Conditions to continue");
      return;
    }
    setPlacing(true);

    const orderId = "NW" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    const utm = getStoredUtm();

    // Build address string
    let deliveryAddress = addrForm.address;
    let deliveryCity = addrForm.city;
    let deliveryState = addrForm.state;
    let deliveryPincode = addrForm.pincode;
    let deliveryPhone = addrForm.phone;
    let deliveryName = `${addrForm.firstName} ${addrForm.lastName}`.trim();

    if (selectedAddressId !== null && user) {
      const addr = user.addresses.find(a => a.id === selectedAddressId);
      if (addr) {
        deliveryAddress = `${addr.flat}${addr.area ? ", " + addr.area : ""}`;
        deliveryCity = addr.city;
        deliveryState = addr.state;
        deliveryPincode = addr.pincode;
        deliveryPhone = addr.phone;
        deliveryName = addr.name;
      }
    }

    if (paymentPlan !== "cod") {
      const pendingOrderData = {
        orderId,
        total: finalTotal,
        payNow: payNowAmount,
        plan: paymentPlan,
        items,
        form: { ...addrForm, address: deliveryAddress, city: deliveryCity, state: deliveryState, pincode: deliveryPincode, phone: deliveryPhone, firstName: deliveryName },
        coupon: appliedCoupon,
        couponDiscount,
        isGiftWrapped,
        giftMessage: isGiftWrapped ? giftMessage : undefined,
      };

      // ── Razorpay ──
      if (paymentPlan.startsWith("razorpay")) {
        try {
          await placeOrderMutation.mutateAsync({
            id: orderId,
            customerName: deliveryName || user?.name || "Guest",
            phone: deliveryPhone || user?.mobile || "",
            email: addrForm.email || user?.email || "",
            address: deliveryAddress,
            city: deliveryCity,
            state: deliveryState,
            pincode: deliveryPincode,
            items: items.map(it => ({ id: String(it.id), name: it.name, price: it.price, quantity: it.quantity, image: it.image, weight: it.weight })),
            subtotal: totalPrice,
            couponCode: appliedCoupon?.code,
            couponDiscount,
            total: finalTotal,
            paymentMethod: "Razorpay",
            paymentPlan: paymentPlan,
            amountPaid: 0,
            status: "pending_payment",
            isGiftWrapped,
            giftMessage: isGiftWrapped ? giftMessage || undefined : undefined,
            redeemPoints: redeemPointsToSend || undefined,
            notes: orderNote.trim() || undefined,
            ...utm,
          });

          const rzOrder = await initiateRazorpay.mutateAsync({
            orderId,
          });
          sessionStorage.setItem("nutriwow_pending_order", JSON.stringify(pendingOrderData));

          // Load Razorpay checkout.js if not already loaded
          if (!window.Razorpay) {
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement("script");
              script.src = "https://checkout.razorpay.com/v1/checkout.js";
              script.onload = () => resolve();
              script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
              document.head.appendChild(script);
            });
          }

          const rzOptions = {
            key: rzOrder.keyId,
            amount: rzOrder.amount,
            currency: "INR",
            name: "Nutriwow",
            description: `Order #${orderId}`,
            order_id: rzOrder.razorpayOrderId,
            prefill: {
              name: deliveryName,
              contact: deliveryPhone,
              email: addrForm.email || "",
            },
            theme: { color: "#43A047" },
            handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
              try {
                await verifyRazorpay.mutateAsync({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  orderId,
                });
                await confirmOrderMutation.mutateAsync({ orderId, paymentId: response.razorpay_payment_id });
                fireCartEvent('order_placed');
                sessionStorage.setItem("nutriwow_last_order", JSON.stringify({ orderId, total: finalTotal, items, email: addrForm.email || user?.email || "", isGiftWrapped, giftMessage: isGiftWrapped ? giftMessage : undefined }));
                localStorage.removeItem(CART_COUPON_KEY);
                tryApplyReferral();
                clearCart();
                setIsCartOpen(false);
                toast.success(`Payment successful! Order #${orderId} confirmed.`);
                window.location.href = `/payment-status?orderId=${orderId}&total=${finalTotal}&plan=${paymentPlan}&status=SUCCESS`;
              } catch (err: any) {
                toast.error(err?.message || "Payment verification failed. Please contact support.");
              }
            },
            modal: {
              ondismiss: () => {
                setPlacing(false);
                toast.error("Payment cancelled. Please try again.");
              },
            },
          };

          const rzInstance = new window.Razorpay(rzOptions);
          rzInstance.open();
          setPlacing(false);
          return;
        } catch (err: any) {
          setPlacing(false);
          toast.error(err?.message || "Razorpay payment initiation failed. Please try again.");
          return;
        }
      }

      // ── PhonePe ──
      try {
        const baseUrl = window.location.hostname === "localhost" || window.location.hostname.includes("manus.computer")
          ? "https://www.nutriwow.in"
          : window.location.origin;
        const redirectUrl = `${baseUrl}/payment-status?orderId=${orderId}&total=${finalTotal}&plan=${paymentPlan}`;

        // Save order to DB with pending_payment status BEFORE redirecting to PhonePe
        await placeOrderMutation.mutateAsync({
          id: orderId,
          customerName: deliveryName || user?.name || "Guest",
          phone: deliveryPhone || user?.mobile || "",
          email: addrForm.email || user?.email || "",
          address: deliveryAddress,
          city: deliveryCity,
          state: deliveryState,
          pincode: deliveryPincode,
          items: items.map(it => ({ id: String(it.id), name: it.name, price: it.price, quantity: it.quantity, image: it.image, weight: it.weight })),
          subtotal: totalPrice,
          couponCode: appliedCoupon?.code,
          couponDiscount,
          total: finalTotal,
          paymentMethod: "PhonePe",
          paymentPlan: paymentPlan,
          amountPaid: 0,
          status: "pending_payment",
          isGiftWrapped,
          giftMessage: isGiftWrapped ? giftMessage || undefined : undefined,
          redeemPoints: redeemPointsToSend || undefined,
          notes: orderNote.trim() || undefined,
          ...utm,
        });

        const result = await initiatePhonePe.mutateAsync({
          orderId,
          amount: payNowAmount,
          mobile: isLoggedIn && user ? user.mobile : deliveryPhone,
          redirectUrl,
        });

        sessionStorage.setItem("nutriwow_pending_order", JSON.stringify(pendingOrderData));
        setPlacing(false);
        setIsCartOpen(false);
        window.location.href = result.checkoutUrl;
        return;
      } catch (err: any) {
        setPlacing(false);
        toast.error(err?.message || "Payment initiation failed. Please try again.");
        return;
      }
    }

    // COD — save order to DB
    try {
      await placeOrderMutation.mutateAsync({
        id: orderId,
        customerName: deliveryName || user?.name || "Guest",
        phone: deliveryPhone || user?.mobile || "",
        email: addrForm.email || user?.email || "",
        address: deliveryAddress,
        city: deliveryCity,
        state: deliveryState,
        pincode: deliveryPincode,
        items: items.map(it => ({
          id: String(it.id),
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          image: it.image,
          weight: it.weight,
        })),
        subtotal: totalPrice,
        couponCode: appliedCoupon?.code,
        couponDiscount,
        total: finalTotal,
        paymentMethod: "COD",
        paymentPlan: "cod",
        amountPaid: 0,
        isGiftWrapped,
        giftMessage: isGiftWrapped ? giftMessage || undefined : undefined,
        redeemPoints: redeemPointsToSend || undefined,
        notes: orderNote.trim() || undefined,
        ...utm,
      });

      fireCartEvent('order_placed');
      sessionStorage.setItem("nutriwow_last_order", JSON.stringify({ orderId, total: finalTotal, items, email: addrForm.email || user?.email || "", isGiftWrapped, giftMessage: isGiftWrapped ? giftMessage : undefined }));
      localStorage.removeItem(CART_COUPON_KEY);
      tryApplyReferral();
      clearCart();
      setPlacing(false);
      setIsCartOpen(false);
      // Redirect to PaymentStatus page (shows WhatsApp confirm button + order summary)
      window.location.href = `/payment-status?orderId=${orderId}&total=${finalTotal}&plan=cod&status=SUCCESS`;
    } catch (err: any) {
      setPlacing(false);
      toast.error(err?.message || "Failed to place order. Please try again.");
    }
  };

  if (!isCartOpen) return null;

  const stepLabels = ["Cart", "Address", "Payment"];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-clay-brown/40 z-50" onClick={() => setIsCartOpen(false)} />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-[400px] bg-background z-50 shadow-clay-lg rounded-l-3xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep((step - 1) as Step)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <h2 className="text-[15px] font-bold text-foreground">
              {step === 1 ? `Your Cart (${totalItems})` : step === 2 ? "Delivery Address" : "Payment"}
            </h2>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        {items.length > 0 && (
          <div className="flex items-center justify-center gap-1 px-5 py-2 bg-muted border-b border-border">
            {stepLabels.map((label, i) => {
              const stepNum = (i + 1) as Step;
              const done = step > stepNum;
              const active = step === stepNum;
              return (
                <div key={label} className="flex items-center gap-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                    done ? "bg-primary text-primary-foreground shadow-clay-sm" : active ? "bg-primary text-primary-foreground shadow-clay-sm" : "bg-muted text-muted-foreground"
                  }`}>
                    {done ? <CheckCircle2 size={11} /> : stepNum}
                  </div>
                  <span className={`text-[10px] font-medium ${active || done ? "text-primary" : "text-muted-foreground/70"}`}>{label}</span>
                  {i < 2 && <span className="text-muted-foreground/50 text-[10px] mx-0.5">›</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* EMPTY STATE */}
        {/* ═══════════════════════════════════════════════════════ */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-4">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
              <ShoppingBag size={32} className="text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground mb-1">Your cart is empty</p>
              <p className="text-sm text-muted-foreground/70">Add some healthy snacks to get started!</p>
            </div>
            <button onClick={() => setIsCartOpen(false)} className="mt-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all">
              Shop Now
            </button>
          </div>

        ) : step === 1 ? (
          /* ═══════════════════════════════════════════════════════ */
          /* STEP 1: CART + COUPON */
          /* ═══════════════════════════════════════════════════════ */
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="bg-nutrigreen text-white text-center py-2 px-4 text-[13px] font-semibold flex items-center justify-center gap-2">
                <Truck size={14} />
                Enjoy FREE Shipping on All Orders
              </div>

              {/* Milestone Progress */}
              <div className="px-4 pt-3 pb-2 relative overflow-hidden">
                {/* Confetti overlay */}
                {showConfetti && (
                  <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 rounded-sm"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `-10%`,
                          backgroundColor: ['#43A047', '#FF6D00', '#FFD600', '#E91E63', '#2196F3', '#9C27B0'][i % 6],
                          animation: `confetti-fall ${1.5 + Math.random() * 1.5}s ease-in forwards`,
                          animationDelay: `${Math.random() * 0.5}s`,
                          transform: `rotate(${Math.random() * 360}deg)`,
                        }}
                      />
                    ))}
                  </div>
                )}
                {Number(shippingCfg.freeAbove) > 0 && (
                  shippingFee > 0 ? (
                    <p className="text-[12px] text-nutriorange font-semibold text-center mb-2">
                      🚚 Add ₹{Math.max(0, Number(shippingCfg.freeAbove) - goodsTotal).toLocaleString("en-IN")} more for <span className="font-bold">FREE shipping!</span>
                    </p>
                  ) : (
                    <p className="text-[12px] text-nutrigreen font-bold text-center mb-2">
                      🚚 You've unlocked FREE shipping!
                    </p>
                  )
                )}
                {nextMilestone ? (
                  <p className="text-[12px] text-nutrigreen font-medium text-center mb-2">
                    Add ₹{amountToNext} more for <span className="font-bold">{nextMilestone.label}</span>
                  </p>
                ) : (
                  <p className="text-[12px] text-nutrigreen font-bold text-center mb-2">
                    🎉 You have successfully reached the milestone!
                  </p>
                )}
                {/* Progress bar with milestone markers */}
                <div className="relative">
                  {/* Amount labels above the bar */}
                  <div className="flex justify-between mb-1">
                    {MILESTONES.map((m) => {
                      const reached = totalPrice >= m.threshold;
                      return (
                        <div key={m.threshold} className="flex flex-col items-center" style={{ width: `${100 / MILESTONES.length}%` }}>
                          <span className={`text-[12px] font-bold ${reached ? "text-nutrigreen" : "text-muted-foreground/70"}`}>
                            ₹{m.threshold}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Bar */}
                  <div className="h-2 bg-muted rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-nutrigreen rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${milestoneProgress}%` }}
                    />
                  </div>
                  {/* Milestone checkmarks below */}
                  <div className="flex justify-between mt-1.5">
                    {MILESTONES.map((m) => {
                      const reached = totalPrice >= m.threshold;
                      return (
                        <div key={m.threshold} className="flex flex-col items-center gap-0.5" style={{ width: `${100 / MILESTONES.length}%` }}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                            reached
                              ? "bg-nutrigreen text-white shadow-clay-sm"
                              : "bg-muted text-muted-foreground/70"
                          }`}>
                            {reached ? <Check size={14} strokeWidth={3} /> : <span className="text-[10px]">{m.icon}</span>}
                          </div>
                          <span className={`text-[10px] font-semibold ${reached ? "text-nutrigreen" : "text-muted-foreground/70"}`}>{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Cart Items */}
              <div className="px-4 pt-2 pb-3 space-y-2">
                {items.map((item) => {
                  const itemTotal = item.price * item.quantity;
                  const originalTotal = item.originalPrice * item.quantity;
                  const saved = originalTotal - itemTotal;
                  const bulkDisc = getBulkDiscount(item.quantity);
                  const bulkUnitPrice = getBulkPrice(item.price, item.quantity);
                  const bulkItemTotal = bulkUnitPrice * item.quantity;
                  const bulkItemSavings = itemTotal - bulkItemTotal;
                  return (
                    <div key={`${item.id}-${(item as any).weight ?? ""}`} className="bg-card shadow-clay-sm rounded-2xl p-3 flex gap-3">
                      <div className="w-[70px] h-[70px] bg-card rounded-xl shadow-clay-sm flex-shrink-0 overflow-hidden">
                        <img src={optImg(item.image, 128)} alt={item.name} className="w-full h-full object-contain p-1" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-foreground leading-tight line-clamp-2 mb-0.5">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground/70 mb-1">{item.weight}</p>
                        {bulkDisc > 0 && (
                          <p className="text-[10px] text-nutrigreen font-semibold mb-1">
                            {Math.round(bulkDisc * 100)}% bulk discount applied
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-0 rounded-full bg-background shadow-clay-pressed overflow-hidden">
                            <button onClick={() => removeFromCart(item.id, (item as any).weight)} className="px-2 py-1.5 text-muted-foreground/70 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 size={12} />
                            </button>
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1, (item as any).weight)} className="px-2.5 py-1.5 text-muted-foreground hover:bg-accent transition-colors">
                              <Minus size={12} />
                            </button>
                            <span className="text-[13px] font-bold text-foreground w-6 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1, (item as any).weight)} className="px-2.5 py-1.5 text-muted-foreground hover:bg-accent transition-colors">
                              <Plus size={12} />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-[14px] font-bold text-foreground">₹{bulkItemTotal.toLocaleString("en-IN")}</p>
                            {bulkDisc > 0 && <p className="text-[10px] text-muted-foreground/70 line-through">₹{itemTotal.toLocaleString("en-IN")}</p>}
                            {bulkDisc === 0 && saved > 0 && <p className="text-[10px] text-muted-foreground/70 line-through">₹{originalTotal.toLocaleString("en-IN")}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Section */}
              <div className="mx-4 mb-4">
                {/* Applied coupon display */}
                {appliedCoupon && (
                  <div className="border border-nutrigreen bg-clay-green rounded-xl p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-nutrigreen rounded-full flex items-center justify-center">
                          <Tag size={13} className="text-white" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-nutrigreen">Save ₹{couponDiscount.toLocaleString("en-IN")}</p>
                          <p className="text-[10px] text-muted-foreground">with '{appliedCoupon.code}'</p>
                        </div>
                      </div>
                      <button onClick={removeCoupon} className="text-[11px] text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-2.5 py-1 transition-colors">Remove</button>
                    </div>
                  </div>
                )}

                {/* Best coupon suggestion (when no coupon applied) */}
                {!appliedCoupon && bestCouponSuggestion && (
                  <div className="border border-dashed border-nutrigreen bg-clay-green rounded-xl p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-clay-green rounded-full flex items-center justify-center">
                          <Tag size={13} className="text-nutrigreen" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-nutrigreen">Save ₹{bestCouponSuggestion.savings.toLocaleString("en-IN")}</p>
                          <p className="text-[10px] text-muted-foreground">with '{bestCouponSuggestion.code}'</p>
                        </div>
                      </div>
                      <button onClick={() => applyCouponByCode(bestCouponSuggestion.code)} className="px-3 py-1.5 bg-nutrigreen text-white text-[11px] font-semibold rounded-full shadow-clay-sm hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all">Apply</button>
                    </div>
                  </div>
                )}

                {/* Coupon input + list toggle */}
                <div className="rounded-2xl p-3 bg-muted shadow-clay-sm">
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1 flex items-center gap-2 bg-card border-0 shadow-clay-pressed rounded-full px-3 py-2">
                      <Tag size={13} className="text-muted-foreground flex-shrink-0" />
                      <input
                        type="text"
                        value={couponInput}
                        onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                        onKeyDown={e => e.key === "Enter" && applyCouponByCode(couponInput)}
                        placeholder="Enter coupon code"
                        className="flex-1 text-[13px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <button onClick={() => applyCouponByCode(couponInput)} className="px-4 py-2 bg-clay-green text-nutrigreen text-[13px] font-semibold rounded-full shadow-clay-sm hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all">Apply</button>
                  </div>
                  {couponError && <p className="text-[11px] text-red-500 mb-1.5 ml-1">{couponError}</p>}

                  {/* View all coupons link */}
                  <div className="flex items-center justify-between">
                    <button onClick={() => setShowCouponList(!showCouponList)} className="flex items-center gap-1 text-[11px] text-nutrigreen font-medium">
                      <Tag size={11} />
                      {availableCoupons.filter(c => totalPrice >= c.minOrder && (!appliedCoupon || c.code !== appliedCoupon.code)).length > 0 && (
                        <span className="text-nutrigreen">+{availableCoupons.filter(c => totalPrice >= c.minOrder && (!appliedCoupon || c.code !== appliedCoupon.code)).length} more offers</span>
                      )}
                    </button>
                    <button onClick={() => setShowCouponList(!showCouponList)} className="flex items-center gap-1 text-[11px] text-nutrigreen font-medium">
                      View all coupons <ChevronDown size={12} className={`transition-transform ${showCouponList ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {/* Expanded coupon list */}
                  {showCouponList && (
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Available Coupons</p>
                      {availableCoupons.map(coupon => {
                        const isApplied = appliedCoupon?.code === coupon.code;
                        const isEligible = totalPrice >= coupon.minOrder;
                        const savings = coupon.type === "percent"
                          ? Math.round(totalPrice * coupon.discount / 100)
                          : coupon.discount;
                        const isExpanded = expandedCoupon === coupon.code;
                        const isMilestoneCoupon = MILESTONE_COUPON_CODES.includes(coupon.code);
                        return (
                          <div key={coupon.code} className={`bg-card border rounded-2xl overflow-hidden transition-all ${
                            isApplied ? "border-nutrigreen bg-clay-green" : isEligible ? "border-border" : "border-border/50 opacity-60"
                          }`}>
                            <div className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                    isApplied ? "bg-nutrigreen text-white" : "bg-clay-green text-nutrigreen"
                                  }`}>
                                    <Tag size={13} />
                                  </div>
                                  <div>
                                    <p className="text-[13px] font-bold text-foreground">{coupon.code}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                      {coupon.type === "percent" ? `${coupon.discount}% off` : `₹${coupon.discount} off`}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/70">
                                      {coupon.minOrder > 0 ? `on orders above ₹${coupon.minOrder.toLocaleString("en-IN")}` : "on all orders"}
                                    </p>
                                  </div>
                                </div>
                                {isApplied ? (
                                  <span className="text-[11px] text-nutrigreen font-bold bg-clay-green px-2.5 py-1 rounded-lg">Applied</span>
                                ) : (
                                  <button
                                    onClick={() => isEligible && applyCouponByCode(coupon.code)}
                                    disabled={!isEligible}
                                    className={`text-[11px] font-semibold rounded-lg px-3 py-1.5 transition-colors ${
                                      isEligible
                                        ? "bg-nutrigreen text-white hover:brightness-105"
                                        : "bg-muted text-muted-foreground/70 cursor-not-allowed"
                                    }`}
                                  >
                                    Apply
                                  </button>
                                )}
                              </div>
                              {isEligible && (
                                <p className="text-[11px] text-nutrigreen font-semibold mt-1.5 ml-9">
                                  Save ₹{savings.toLocaleString("en-IN")} on this order!
                                </p>
                              )}
                              {!isEligible && (
                                <p className="text-[11px] text-orange-500 font-medium mt-1.5 ml-9">
                                  Add ₹{(coupon.minOrder - totalPrice).toLocaleString("en-IN")} more to unlock
                                </p>
                              )}
                              {/* View more / Hide details toggle */}
                              <button
                                onClick={() => setExpandedCoupon(isExpanded ? null : coupon.code)}
                                className="text-[10px] text-muted-foreground/70 hover:text-muted-foreground mt-1.5 ml-9 flex items-center gap-0.5"
                              >
                                {isExpanded ? "Hide details" : "View more"}
                                <ChevronDown size={10} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              </button>
                            </div>
                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="px-3 pb-3 pt-0 ml-9">
                                <div className="bg-muted rounded-xl p-2 space-y-1">
                                  <p className="text-[10px] text-muted-foreground flex items-start gap-1">
                                    <span className="text-muted-foreground/70 mt-0.5">•</span>
                                    Flat {coupon.type === "percent" ? `${coupon.discount}%` : `₹${coupon.discount}`} off the order total
                                  </p>
                                  {coupon.minOrder > 0 && (
                                    <p className="text-[10px] text-muted-foreground flex items-start gap-1">
                                      <span className="text-muted-foreground/70 mt-0.5">•</span>
                                      Valid on minimum purchase of ₹{coupon.minOrder.toLocaleString("en-IN")}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-muted-foreground flex items-start gap-1">
                                    <span className="text-muted-foreground/70 mt-0.5">•</span>
                                    Cannot be combined with other discounts
                                  </p>
                                  {isMilestoneCoupon && (
                                    <p className="text-[10px] text-nutrigreen flex items-start gap-1 font-medium">
                                      <span className="text-nutrigreen mt-0.5">•</span>
                                      Auto-applies when milestone is reached
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ── You Might Also Like ── */}
              {recommendedProducts.length > 0 && (
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Star size={14} className="text-nutriorange fill-nutriorange" />
                    <h4 className="text-[13px] font-bold text-foreground font-serif">You might also like</h4>
                  </div>
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                    {recommendedProducts.map((rp) => (
                      <div key={rp.id} className="flex-shrink-0 w-[200px] flex items-center gap-2 bg-card rounded-2xl shadow-clay-sm p-2">
                        <img
                          src={optImg(rp.image, 120)}
                          alt={rp.name}
                          className="w-14 h-14 object-contain rounded-xl bg-background flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-foreground leading-tight line-clamp-2">{rp.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[12px] font-bold text-foreground">₹{rp.price.toLocaleString("en-IN")}</span>
                            {rp.originalPrice > rp.price && (
                              <span className="text-[10px] text-muted-foreground line-through">₹{rp.originalPrice.toLocaleString("en-IN")}</span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              addToCart(rp);
                              toast.success("Added to cart!");
                            }}
                            className="mt-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold hover:brightness-105 active:translate-y-0.5 transition-all"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loyalty Points Redemption */}
              {canRedeemLoyalty && (
                <div className="mx-4 mb-4">
                  <div className="bg-clay-butter rounded-2xl p-4 shadow-clay-sm flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-clay-sm text-white text-sm">★</div>
                      <div>
                        <p className="text-[13px] font-bold text-clay-brown">Use Loyalty Points</p>
                        <p className="text-[11px] text-clay-brown/70">
                          {loyaltyBalancePts} pts available · up to ₹{Math.floor(Math.min(loyaltyBalancePts, maxRedeem) / perDisc)} off
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseLoyalty(v => !v)}
                      aria-label="Toggle loyalty points"
                      className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${useLoyalty ? "bg-amber-500" : "bg-gray-300"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${useLoyalty ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>
              )}

              {/* Gift Wrap Section */}
              <div className="mx-4 mb-4">
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 shadow-clay-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center shadow-clay-sm">
                        <Gift size={15} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-foreground">Add Gift Wrapping</p>
                        <p className="text-[11px] text-muted-foreground/70">Premium gift wrap + card · ₹{GIFT_WRAP_FEE}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setIsGiftWrapped(!isGiftWrapped); if (isGiftWrapped) setGiftMessage(""); }}
                      className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${isGiftWrapped ? "bg-purple-500" : "bg-gray-300"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${isGiftWrapped ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  {isGiftWrapped && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value.slice(0, 150))}
                        placeholder="Write a gift message (optional)"
                        rows={2}
                        className="w-full bg-white shadow-clay-pressed rounded-xl p-3 text-[12px] text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-purple-300"
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground/60">Your message will be printed on a gift card</p>
                        <p className={`text-[10px] font-medium ${giftMessage.length >= 140 ? "text-red-400" : "text-muted-foreground/50"}`}>{giftMessage.length}/150</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border bg-card">
              <button onClick={() => setShowSummary(!showSummary)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-accent transition-colors">
                <div>
                  <span className="text-[13px] font-medium text-muted-foreground">Estimated total</span>
                  {totalSavings > 0 && (
                    <p className="text-[11px] text-nutrigreen font-semibold">You saved ₹{totalSavings.toLocaleString("en-IN")}!</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    {totalSavings > 0 && <span className="text-[11px] text-muted-foreground/70 line-through mr-1.5">₹{mrpTotal.toLocaleString("en-IN")}</span>}
                    <span className="text-[17px] font-bold text-foreground">₹{finalTotal.toLocaleString("en-IN")}</span>
                  </div>
                  {showSummary ? <ChevronDown size={15} className="text-muted-foreground/70" /> : <ChevronUp size={15} className="text-muted-foreground/70" />}
                </div>
              </button>
              {showSummary && (
                <div className="px-5 pb-3 space-y-1.5 border-t border-border/50">
                  <div className="flex justify-between text-[12px] text-muted-foreground pt-2">
                    <span>MRP Total ({totalItems} items)</span>
                    <span>₹{mrpTotal.toLocaleString("en-IN")}</span>
                  </div>
                  {productDiscount > 0 && (
                    <div className="flex justify-between text-[12px] text-nutrigreen">
                      <span>Product Discount</span>
                      <span className="font-semibold">- ₹{productDiscount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[12px] text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₹{totalPrice.toLocaleString("en-IN")}</span>
                  </div>
                  {bulkDiscountTotal > 0 && (
                    <div className="flex justify-between text-[12px] text-nutrigreen">
                      <span>Bulk Discount</span>
                      <span className="font-semibold">- ₹{bulkDiscountTotal.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-[12px] text-nutrigreen">
                      <span>Coupon ({appliedCoupon?.code})</span>
                      <span className="font-semibold">- ₹{couponDiscount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-[12px] text-nutrigreen">
                      <span>Loyalty Points ({redeemPointsToSend} pts)</span>
                      <span className="font-semibold">- ₹{loyaltyDiscount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {prepaidDiscount > 0 && (
                    <div className="flex justify-between text-[12px] text-nutrigreen">
                      <span>Online Payment Discount ({prepaidPct}%)</span>
                      <span className="font-semibold">- ₹{prepaidDiscount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {prepaidDiscount === 0 && prepaidPct > 0 && paymentPlan === "cod" && (
                    <div className="flex justify-between text-[12px] text-nutriorange">
                      <span>💡 Pay online & save {prepaidPct}%</span>
                      <span className="font-semibold">- ₹{Math.round(goodsAfterLoyalty * prepaidPct / 100).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className={`flex justify-between text-[12px] ${shippingFee > 0 ? "text-muted-foreground" : "text-nutrigreen"}`}>
                    <span>Shipping</span>
                    <span className="font-semibold">{shippingFee > 0 ? `₹${shippingFee.toLocaleString("en-IN")}` : "FREE"}</span>
                  </div>
                  {isGiftWrapped && (
                    <div className="flex justify-between text-[12px] text-purple-600">
                      <span className="flex items-center gap-1"><Gift size={11} /> Gift Wrapping</span>
                      <span className="font-semibold">₹{GIFT_WRAP_FEE}</span>
                    </div>
                  )}
                  {shippingFee > 0 && shippingCfg.freeAbove ? (
                    <p className="text-[11px] text-nutrigreen">Add ₹{Math.max(0, Number(shippingCfg.freeAbove) - goodsTotal).toLocaleString("en-IN")} more for FREE shipping</p>
                  ) : null}
                  <div className="flex justify-between text-[13px] font-bold text-foreground pt-1 border-t border-border">
                    <span>Total</span>
                    <span>₹{finalTotal.toLocaleString("en-IN")}</span>
                  </div>
                  {totalSavings > 0 && (
                    <p className="text-[12px] text-nutrigreen font-bold text-right">🎉 You saved ₹{totalSavings.toLocaleString("en-IN")}!</p>
                  )}
                </div>
              )}
              <div className="px-4 pb-5 pt-2">
                {belowMin && (
                  <p className="text-center text-[12px] text-red-600 font-semibold mb-2">
                    Minimum order ₹{minOrder.toLocaleString("en-IN")} — add ₹{minShortfall.toLocaleString("en-IN")} more to checkout
                  </p>
                )}
                <button onClick={handleProceedToAddress} disabled={belowMin} className="w-full block text-center bg-primary text-primary-foreground py-3.5 rounded-full font-bold text-[14px] shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100">
                  Proceed to Checkout · ₹{finalTotal.toLocaleString("en-IN")}
                </button>
                <p className="text-center text-[10px] text-muted-foreground/70 mt-2">{shippingFee > 0 ? `₹${shippingFee} shipping · ` : "Free shipping · "}Secure checkout · Easy returns</p>
              </div>
            </div>
          </>

        ) : step === 2 ? (
          /* ═══════════════════════════════════════════════════════ */
          /* STEP 2: ADDRESS */
          /* ═══════════════════════════════════════════════════════ */
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {!isLoggedIn && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                  <p className="text-[12px] text-amber-700 font-medium">Login to use saved addresses</p>
                  <button onClick={() => { setIsCartOpen(false); setIsLoginOpen(true); }} className="text-[11px] text-nutrigreen font-bold border border-nutrigreen rounded-lg px-2.5 py-1 hover:bg-clay-green transition-colors">Login</button>
                </div>
              )}

              {/* Saved addresses */}
              {isLoggedIn && user && user.addresses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Saved Addresses</p>
                  {user.addresses.map(addr => (
                    <label key={addr.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                      selectedAddressId === addr.id && !showAddressForm ? "border-nutrigreen bg-clay-green" : "border-border hover:border-border/80"
                    }`} onClick={() => { setSelectedAddressId(addr.id); setShowAddressForm(false); }}>
                      <input type="radio" name="savedAddress" checked={selectedAddressId === addr.id && !showAddressForm}
                        onChange={() => { setSelectedAddressId(addr.id); setShowAddressForm(false); }}
                        className="accent-[#43a047] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-foreground">{addr.name}</p>
                          {addr.isDefault && <span className="text-[10px] bg-clay-green text-green-700 font-bold px-1.5 py-0.5 rounded-full">Default</span>}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {addr.flat}{addr.area ? ", " + addr.area : ""}, {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70">📞 {addr.phone}</p>
                      </div>
                      <MapPin size={14} className="text-muted-foreground/50 flex-shrink-0 mt-1" />
                    </label>
                  ))}
                  <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                    showAddressForm ? "border-nutrigreen bg-clay-green" : "border-border hover:border-border/80"
                  }`} onClick={() => { setShowAddressForm(true); setSelectedAddressId(null); }}>
                    <input type="radio" name="savedAddress" checked={showAddressForm}
                      onChange={() => { setShowAddressForm(true); setSelectedAddressId(null); }}
                      className="accent-[#43a047] flex-shrink-0" />
                    <PlusIcon size={14} className="text-nutrigreen" />
                    <span className="text-[13px] font-medium text-nutrigreen">Add New Address</span>
                  </label>
                </div>
              )}

              {/* Address form */}
              {showAddressForm && (
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {isLoggedIn && user && user.addresses.length > 0 ? "New Address" : "Delivery Details"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: "firstName", label: "First Name *", placeholder: "Rahul" },
                      { name: "lastName", label: "Last Name", placeholder: "Sharma" },
                    ].map(f => (
                      <div key={f.name}>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">{f.label}</label>
                        <input type="text" value={addrForm[f.name as keyof typeof addrForm]}
                          onChange={e => setAddrForm({ ...addrForm, [f.name]: e.target.value })}
                          placeholder={f.placeholder}
                          className="w-full px-3 py-2 border-0 bg-card shadow-clay-pressed rounded-2xl text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all" />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Phone *</label>
                      <input type="tel" value={addrForm.phone} onChange={e => setAddrForm({ ...addrForm, phone: e.target.value })}
                        placeholder="9876543210"
                        className="w-full px-3 py-2 border-0 bg-card shadow-clay-pressed rounded-2xl text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Email</label>
                      <input type="email" value={addrForm.email} onChange={e => setAddrForm({ ...addrForm, email: e.target.value })}
                        placeholder="you@email.com"
                        className="w-full px-3 py-2 border-0 bg-card shadow-clay-pressed rounded-2xl text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Full Address *</label>
                    <textarea value={addrForm.address} onChange={e => setAddrForm({ ...addrForm, address: e.target.value })}
                      placeholder="House No., Street, Area, Landmark" rows={2}
                      className="w-full px-3 py-2 border-0 bg-card shadow-clay-pressed rounded-2xl text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">City *</label>
                      <input type="text" value={addrForm.city} onChange={e => setAddrForm({ ...addrForm, city: e.target.value })}
                        placeholder="Mumbai"
                        className="w-full px-3 py-2 border-0 bg-card shadow-clay-pressed rounded-2xl text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Pincode *</label>
                      <input type="text" value={addrForm.pincode} onChange={e => setAddrForm({ ...addrForm, pincode: e.target.value })}
                        placeholder="400001" maxLength={6}
                        className="w-full px-3 py-2 border-0 bg-card shadow-clay-pressed rounded-2xl text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">State</label>
                    <select value={addrForm.state} onChange={e => setAddrForm({ ...addrForm, state: e.target.value })}
                      className="w-full px-3 py-2 border-0 bg-card shadow-clay-pressed rounded-2xl text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all bg-white">
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {isLoggedIn && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={saveAddressToProfile} onChange={e => setSaveAddressToProfile(e.target.checked)} className="accent-[#43a047] w-4 h-4" />
                      <span className="text-[12px] text-muted-foreground">Save this address to my profile</span>
                    </label>
                  )}
                </div>
              )}
              {showOrderNotes && (
                <div className="pt-1">
                  <label className="block text-[12px] font-semibold text-foreground mb-1">Order notes (optional)</label>
                  <textarea
                    value={orderNote}
                    onChange={e => setOrderNote(e.target.value)}
                    rows={2}
                    maxLength={1000}
                    placeholder="Delivery instructions, gift message, etc."
                    className="w-full px-3 py-2 border-0 bg-card shadow-clay-pressed rounded-2xl text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all resize-none"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border bg-card px-4 py-4">
              <div className="flex justify-between text-[13px] text-muted-foreground mb-3">
                <span>Order Total</span>
                <span className="font-bold text-foreground">₹{finalTotal.toLocaleString("en-IN")}</span>
              </div>
              <button onClick={handleProceedToPayment} disabled={addAddressMutation.isPending}
                className="w-full bg-primary text-primary-foreground py-3.5 rounded-full font-bold text-[14px] shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all disabled:opacity-60">
                {addAddressMutation.isPending ? "Saving address..." : "Proceed to Payment"}
              </button>
            </div>
          </>

        ) : (
          /* ═══════════════════════════════════════════════════════ */
          /* STEP 3: PAYMENT */
          /* ═══════════════════════════════════════════════════════ */
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Order Summary mini */}
              <div className="bg-card shadow-clay-sm rounded-2xl p-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Order Summary</p>
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <img src={optImg(item.image, 128)} alt={item.name} className="w-8 h-8 object-contain rounded" />
                    <span className="text-[12px] text-foreground flex-1 truncate">{item.name}</span>
                    <span className="text-[12px] font-semibold text-foreground">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-1.5 flex justify-between">
                  <span className="text-[12px] text-muted-foreground">MRP Total</span>
                  <span className="text-[12px] text-foreground">₹{mrpTotal.toLocaleString("en-IN")}</span>
                </div>
                {productDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[12px] text-nutrigreen">Product Discount</span>
                    <span className="text-[12px] text-nutrigreen font-semibold">- ₹{productDiscount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {bulkDiscountTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[12px] text-nutrigreen">Bulk Discount</span>
                    <span className="text-[12px] text-nutrigreen font-semibold">- ₹{bulkDiscountTotal.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[12px] text-nutrigreen">Coupon ({appliedCoupon?.code})</span>
                    <span className="text-[12px] text-nutrigreen font-semibold">- ₹{couponDiscount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[12px] text-nutrigreen">Shipping</span>
                  <span className="text-[12px] text-nutrigreen font-semibold">{shippingFee > 0 ? `₹${shippingFee.toLocaleString("en-IN")}` : "FREE"}</span>
                </div>
                {isGiftWrapped && (
                  <div className="flex justify-between">
                    <span className="text-[12px] text-purple-600 flex items-center gap-1"><Gift size={11} /> Gift Wrapping</span>
                    <span className="text-[12px] text-purple-600 font-semibold">₹{GIFT_WRAP_FEE}</span>
                  </div>
                )}
                <div className="border-t border-border pt-1.5 flex justify-between">
                  <span className="text-[13px] font-bold text-foreground">Total</span>
                  <span className="text-[13px] font-bold text-foreground">₹{finalTotal.toLocaleString("en-IN")}</span>
                </div>
                {totalSavings > 0 && (
                  <p className="text-[12px] text-nutrigreen font-bold text-right">🎉 You saved ₹{totalSavings.toLocaleString("en-IN")}!</p>
                )}
              </div>

              {/* Payment Options — dynamic based on admin settings */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Choose Payment Method</p>

                {/* PhonePe options */}
                {(activeGateways?.phonepe !== false) && (
                  <>
                    <label className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors mb-2 ${paymentPlan === "phonepe_full" ? "border-[#5f259f] bg-purple-50" : "border-border hover:border-border/80"}`}>
                      <input type="radio" name="payPlan" value="phonepe_full" checked={paymentPlan === "phonepe_full"} onChange={() => setPaymentPlan("phonepe_full")} className="accent-[#5f259f] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Smartphone size={15} className="text-[#5f259f]" />
                            <span className="text-[13px] font-bold text-foreground">Full Payment via PhonePe</span>
                          </div>
                          <span className="text-[13px] font-bold text-[#5f259f]">₹{finalTotal.toLocaleString("en-IN")}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 ml-5">UPI · Cards · Netbanking · Wallets</p>
                      </div>
                    </label>
                    <label className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors mb-2 ${paymentPlan === "phonepe_advance30" ? "border-[#5f259f] bg-purple-50" : "border-border hover:border-border/80"}`}>
                      <input type="radio" name="payPlan" value="phonepe_advance30" checked={paymentPlan === "phonepe_advance30"} onChange={() => setPaymentPlan("phonepe_advance30")} className="accent-[#5f259f] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CreditCard size={15} className="text-orange-500" />
                            <span className="text-[13px] font-bold text-foreground">30% Advance via PhonePe</span>
                          </div>
                          <span className="text-[13px] font-bold text-orange-500">₹{advanceAmount.toLocaleString("en-IN")}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 ml-5">Pay ₹{advanceAmount.toLocaleString("en-IN")} now · ₹{(finalTotal - advanceAmount).toLocaleString("en-IN")} on delivery</p>
                      </div>
                    </label>
                  </>
                )}

                {/* Razorpay options */}
                {activeGateways?.razorpay && (
                  <>
                    <label className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors mb-2 ${paymentPlan === "razorpay_full" ? "border-[#072654] bg-blue-50" : "border-border hover:border-border/80"}`}>
                      <input type="radio" name="payPlan" value="razorpay_full" checked={paymentPlan === "razorpay_full"} onChange={() => setPaymentPlan("razorpay_full")} className="accent-[#072654] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CreditCard size={15} className="text-[#072654]" />
                            <span className="text-[13px] font-bold text-foreground">Full Payment via Razorpay</span>
                          </div>
                          <span className="text-[13px] font-bold text-[#072654]">₹{finalTotal.toLocaleString("en-IN")}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 ml-5">UPI · Cards · Netbanking · Wallets</p>
                      </div>
                    </label>
                    <label className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors mb-2 ${paymentPlan === "razorpay_advance30" ? "border-[#072654] bg-blue-50" : "border-border hover:border-border/80"}`}>
                      <input type="radio" name="payPlan" value="razorpay_advance30" checked={paymentPlan === "razorpay_advance30"} onChange={() => setPaymentPlan("razorpay_advance30")} className="accent-[#072654] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CreditCard size={15} className="text-orange-500" />
                            <span className="text-[13px] font-bold text-foreground">30% Advance via Razorpay</span>
                          </div>
                          <span className="text-[13px] font-bold text-orange-500">₹{advanceAmount.toLocaleString("en-IN")}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 ml-5">Pay ₹{advanceAmount.toLocaleString("en-IN")} now · ₹{(finalTotal - advanceAmount).toLocaleString("en-IN")} on delivery</p>
                      </div>
                    </label>
                  </>
                )}

                {/* COD */}
                <label className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors ${paymentPlan === "cod" ? "border-nutrigreen bg-clay-green" : "border-border hover:border-border/80"}`}>
                  <input type="radio" name="payPlan" value="cod" checked={paymentPlan === "cod"} onChange={() => setPaymentPlan("cod")} className="accent-[#43a047] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Banknote size={15} className="text-blue-500" />
                        <span className="text-[13px] font-bold text-foreground">Cash on Delivery</span>
                      </div>
                      <span className="text-[13px] font-bold text-blue-500">₹{finalTotal.toLocaleString("en-IN")}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 ml-5">Pay when your order arrives</p>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70 justify-center">
                <span>🔒</span>
                <span>100% Secure Payment · 256-bit SSL Encryption</span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border bg-card px-4 py-4">
              {termsRequired && (
                <label className="flex items-start gap-2 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={e => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 accent-primary w-4 h-4 flex-shrink-0"
                  />
                  <span className="text-[11px] text-muted-foreground leading-relaxed">
                    I agree to the{" "}
                    <a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="text-primary underline">Terms &amp; Conditions</a>
                    {" "}and{" "}
                    <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Refund Policy</a>.
                  </span>
                </label>
              )}
              <button onClick={handlePlaceOrder} disabled={placing || (termsRequired && !agreedTerms)}
                className="w-full bg-primary text-primary-foreground py-3.5 rounded-full font-bold text-[14px] shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {placing ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
                ) : paymentPlan === "cod" ? (
                  `Place Order · ₹${finalTotal.toLocaleString("en-IN")}`
                ) : paymentPlan.startsWith("razorpay") ? (
                  `Pay ₹${payNowAmount.toLocaleString("en-IN")} via Razorpay`
                ) : (
                  `Pay ₹${payNowAmount.toLocaleString("en-IN")} via PhonePe`
                )}
              </button>
              <p className="text-center text-[10px] text-muted-foreground/70 mt-2">
                {paymentPlan === "cod" ? "We'll call to confirm your order" :
                 paymentPlan.startsWith("razorpay") ? "Razorpay secure checkout will open" :
                 "You'll be redirected to PhonePe"}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
