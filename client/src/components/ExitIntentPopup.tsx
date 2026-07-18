/**
 * Exit-intent popup — offers a discount to visitors about to leave.
 *
 * Desktop: fires when mouse moves toward the top of the viewport (clientY < 10).
 * Mobile:  fires after 30s idle + 50% scroll depth.
 * Shows only once per session, skipped if cart has items or on checkout/admin pages.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Copy, CheckCircle2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";
import { toast } from "sonner";

const SESSION_KEY = "nutriwow_exit_popup_shown";
const COUPON_CODE = "WELCOME10";
const ARM_DELAY_MS = 3_000;
const MOBILE_IDLE_MS = 30_000;

export default function ExitIntentPopup() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [closing, setClosing] = useState(false);
  const armed = useRef(false);
  const { items } = useCart();
  const [location] = useLocation();

  // Should we even consider showing the popup?
  const shouldSuppress =
    items.length > 0 ||
    location.startsWith("/checkout") ||
    location.startsWith("/admin") ||
    location.startsWith("/order-confirmation") ||
    sessionStorage.getItem(SESSION_KEY) === "1";

  const show = useCallback(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 200);
  }, []);

  // ── Desktop: mouseout toward top ─────────────────────────────────────────
  useEffect(() => {
    if (shouldSuppress) return;

    const armTimeout = setTimeout(() => {
      armed.current = true;
    }, ARM_DELAY_MS);

    const handleMouseOut = (e: MouseEvent) => {
      if (!armed.current) return;
      if (e.clientY < 10) show();
    };

    document.addEventListener("mouseout", handleMouseOut);
    return () => {
      clearTimeout(armTimeout);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, [shouldSuppress, show]);

  // ── Mobile: idle 30s + scrolled 50% ──────────────────────────────────────
  useEffect(() => {
    if (shouldSuppress) return;

    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let scrolledPast50 = false;

    const checkScroll = () => {
      const scrollPct =
        window.scrollY /
        (document.documentElement.scrollHeight - window.innerHeight || 1);
      if (scrollPct >= 0.5) scrolledPast50 = true;
    };

    const resetIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (scrolledPast50 && armed.current) show();
      }, MOBILE_IDLE_MS);
    };

    // Arm after delay
    const armTimeout = setTimeout(() => {
      armed.current = true;
      // Start the first idle timer
      resetIdle();
    }, ARM_DELAY_MS);

    window.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("touchstart", resetIdle, { passive: true });
    window.addEventListener("touchmove", resetIdle, { passive: true });

    return () => {
      clearTimeout(armTimeout);
      if (idleTimer) clearTimeout(idleTimer);
      window.removeEventListener("scroll", checkScroll);
      window.removeEventListener("touchstart", resetIdle);
      window.removeEventListener("touchmove", resetIdle);
    };
  }, [shouldSuppress, show]);

  const handleCopyCoupon = async () => {
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
      setCopied(true);
      toast.success("Coupon code copied! Apply it at checkout.");
      setTimeout(dismiss, 1200);
    } catch {
      // Fallback: select-all in a hidden input
      toast.success(`Use code ${COUPON_CODE} at checkout!`);
      setTimeout(dismiss, 1200);
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div
        className={`relative bg-card rounded-3xl shadow-clay-lg max-w-md w-full mx-auto p-8 transition-all duration-200 ${closing ? "scale-95 opacity-0" : "scale-100 opacity-100"} animate-in`}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="text-center space-y-5">
          {/* Decorative emoji header */}
          <div className="text-4xl">🥜</div>

          <h2 className="text-2xl font-bold font-serif text-foreground leading-tight">
            Wait! Don't leave empty-handed
          </h2>
          <p className="text-muted-foreground text-sm">
            Get <span className="font-bold text-primary">10% off</span> your
            first order with this exclusive coupon
          </p>

          {/* Coupon code box */}
          <div className="font-mono text-xl font-bold tracking-wider bg-muted px-6 py-3 rounded-xl shadow-clay-pressed text-center text-foreground select-all">
            {COUPON_CODE}
          </div>

          {/* CTA */}
          <button
            onClick={handleCopyCoupon}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-full py-3 px-8 text-sm font-bold shadow-clay-btn transition-all hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed"
          >
            {copied ? (
              <>
                <CheckCircle2 size={16} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Claim My Discount
              </>
            )}
          </button>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            No thanks, I'll pay full price
          </button>
        </div>
      </div>

      <style>{`
        .animate-in {
          animation: exitPopupIn 0.3s ease-out;
        }
        @keyframes exitPopupIn {
          from { transform: scale(0.9); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
