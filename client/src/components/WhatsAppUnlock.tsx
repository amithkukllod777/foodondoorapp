/**
 * WhatsApp opt-in → discount unlock (competitor parity, Kapiva-style).
 * Captures the mobile number, subscribes to WhatsApp updates (newsletter.subscribe,
 * which also sends the welcome message), and reveals the WELCOME10 code with a
 * one-tap copy. The code must exist as an active coupon in Admin → Coupons.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { MessageCircle, Check, Copy } from "lucide-react";
import { toast } from "sonner";

const UNLOCK_CODE = "WELCOME10";

export default function WhatsAppUnlock() {
  const [phone, setPhone] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const subscribe = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => setUnlocked(true),
    onError: (e) => toast.error(e.message || "Could not unlock. Please try again."),
  });

  const submit = () => {
    if (!/^\d{10}$/.test(phone.trim())) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    subscribe.mutate({ phone: phone.trim() });
  };

  const copy = () => {
    navigator.clipboard.writeText(UNLOCK_CODE);
    toast.success(`${UNLOCK_CODE} copied!`);
  };

  return (
    <div className="rounded-3xl bg-gradient-to-r from-clay-green/40 to-clay-butter shadow-clay p-5">
      {!unlocked ? (
        <>
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle size={18} className="text-[#25D366]" />
            <h3 className="text-sm font-bold text-clay-brown font-serif">Unlock 10% OFF on WhatsApp</h3>
          </div>
          <p className="text-[11px] text-clay-brown/70 mb-3">
            Get your welcome code plus offers &amp; order updates on WhatsApp. You can opt out anytime.
          </p>
          <div className="flex gap-2">
            <div className="flex items-center bg-white rounded-2xl shadow-clay-pressed px-3 flex-1">
              <span className="text-sm text-clay-brown/60 font-semibold">+91</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                placeholder="Mobile number"
                className="flex-1 bg-transparent px-2 py-2.5 text-sm text-clay-brown focus:outline-none"
              />
            </div>
            <button
              onClick={submit}
              disabled={subscribe.isPending}
              className="bg-[#25D366] text-white px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-clay-btn hover:-translate-y-0.5 active:translate-y-0.5 transition-all disabled:opacity-60 whitespace-nowrap"
            >
              {subscribe.isPending ? "…" : "Unlock"}
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-1">
          <div className="flex items-center justify-center gap-1.5 mb-2 text-nutrigreen">
            <Check size={18} /> <span className="text-sm font-bold">Unlocked! Also sent to your WhatsApp 🎉</span>
          </div>
          <button
            onClick={copy}
            className="inline-flex items-center gap-2 bg-white rounded-2xl px-4 py-2 shadow-clay-sm hover:-translate-y-0.5 transition-all"
          >
            <span className="text-base font-extrabold tracking-wider text-clay-brown">{UNLOCK_CODE}</span>
            <Copy size={14} className="text-clay-brown/60" />
          </button>
          <p className="text-[11px] text-clay-brown/70 mt-2">10% off your first order — tap the code to copy.</p>
        </div>
      )}
    </div>
  );
}
