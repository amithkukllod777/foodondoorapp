import { useState, useEffect, useRef } from "react";
import { X, MessageCircle, ChevronRight, Send } from "lucide-react";

const WA_NUMBER = "919993883710";
const WA_BASE = `https://wa.me/${WA_NUMBER}`;

interface QuickReply {
  label: string;
  emoji: string;
  message: string;
  subOptions?: QuickReply[];
}

const QUICK_REPLIES: QuickReply[] = [
  {
    label: "Track My Order",
    emoji: "📦",
    message: "Hi! I want to track my order.",
  },
  {
    label: "Place an Order",
    emoji: "🛒",
    message: "Hi! I want to place an order.",
  },
  {
    label: "Product Info",
    emoji: "🌰",
    message: "Hi! I need information about your products.",
  },
  {
    label: "Return / Refund",
    emoji: "↩️",
    message: "Hi! I want to return or get a refund for my order.",
  },
  {
    label: "Offers & Coupons",
    emoji: "🎁",
    message: "Hi! Please share current offers and coupon codes.",
  },
  {
    label: "Talk to Support",
    emoji: "🙋",
    message: "Hi! I need help from your support team.",
  },
];

export default function WhatsAppChatbot() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pulse, setPulse] = useState(true);
  const [location] = useState(window.location.pathname);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Don't show on admin pages
  if (location.startsWith("/admin")) return null;

  useEffect(() => {
    // Show widget after 2 seconds
    const timer = setTimeout(() => setVisible(true), 2000);
    // Stop pulsing after 6 seconds
    const pulseTimer = setTimeout(() => setPulse(false), 6000);
    return () => {
      clearTimeout(timer);
      clearTimeout(pulseTimer);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleQuickReply(reply: QuickReply) {
    const url = `${WA_BASE}?text=${encodeURIComponent(reply.message)}`;
    window.open(url, "_blank");
    setOpen(false);
  }

  if (!visible) return null;

  return (
    <div
      ref={widgetRef}
      className="wa-widget fixed bottom-6 right-5 z-[9999] flex flex-col items-end gap-3"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      {/* Chat popup */}
      {open && (
        <div
          className="bg-card rounded-3xl shadow-clay-lg w-[320px] overflow-hidden"
          style={{
            animation: "slideUp 0.25s ease-out",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
              🌿
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm leading-tight">Nutriwow Support</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                <p className="text-green-100 text-xs">Online • Typically replies in minutes</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Greeting bubble */}
          <div className="px-4 pt-4 pb-2">
            <div
              className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-foreground max-w-[85%]"
              style={{ background: "#f0f0f0" }}
            >
              <p className="font-medium text-foreground mb-1">👋 Namaste!</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Nutriwow mein aapka swagat hai! Hum kaise madad kar sakte hain?
              </p>
            </div>
          </div>

          {/* Quick replies */}
          <div className="px-4 pb-3 space-y-2">
            <p className="text-xs text-muted-foreground/70 font-medium mt-1">Quick Options:</p>
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply.label}
                onClick={() => handleQuickReply(reply)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-full bg-background shadow-clay-sm hover:border-green-400 hover:bg-green-50 transition-all text-left group"
              >
                <span className="text-lg">{reply.emoji}</span>
                <span className="flex-1 text-sm text-foreground font-medium group-hover:text-green-700">
                  {reply.label}
                </span>
                <ChevronRight size={14} className="text-muted-foreground/70 group-hover:text-green-500" />
              </button>
            ))}
          </div>

          {/* Custom message input */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 border-0 bg-background shadow-clay-pressed rounded-full px-3 py-2 focus-within:border-green-400 transition-colors bg-gray-50">
              <input
                type="text"
                placeholder="Ya apna message type karein..."
                className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                    const msg = (e.target as HTMLInputElement).value.trim();
                    window.open(`${WA_BASE}?text=${encodeURIComponent(msg)}`, "_blank");
                    setOpen(false);
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                  if (input?.value.trim()) {
                    window.open(`${WA_BASE}?text=${encodeURIComponent(input.value.trim())}`, "_blank");
                    setOpen(false);
                  }
                }}
                className="text-green-500 hover:text-green-600 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground/70 mt-2">
              WhatsApp par connect karein 🔒
            </p>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
        aria-label="WhatsApp Chat"
      >
        {/* Pulse ring */}
        {pulse && !open && (
          <>
            <span className="absolute inset-0 rounded-full bg-green-400 opacity-30 animate-ping" />
            <span className="absolute inset-0 rounded-full bg-green-400 opacity-20 animate-ping" style={{ animationDelay: "0.5s" }} />
          </>
        )}
        {open ? (
          <X size={24} className="text-white" />
        ) : (
          <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        )}
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
