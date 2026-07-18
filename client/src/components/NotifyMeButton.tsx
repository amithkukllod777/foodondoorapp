/*
 * "Notify me when available" — shown on out-of-stock products. Collects the
 * customer's email/phone and subscribes them to a back-in-stock alert
 * (stock.subscribe). Prefills from the logged-in profile when available.
 */
import { useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";

export default function NotifyMeButton({ productId }: { productId: number }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.mobile || "");
  const [done, setDone] = useState(false);

  const subscribe = trpc.stock.subscribe.useMutation({
    onSuccess: () => { setDone(true); toast.success("We'll notify you when it's back in stock!"); },
    onError: (e) => toast.error(e.message),
  });

  if (done) {
    return (
      <div className="mt-2 flex items-center justify-center gap-2 text-sm font-medium text-nutrigreen bg-clay-green rounded-full py-2.5">
        <Check size={16} /> We'll notify you when it's back!
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-2 flex items-center justify-center gap-2 bg-clay-green text-nutrigreen py-2.5 rounded-full font-bold text-sm shadow-clay-sm hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all"
      >
        <Bell size={16} /> Notify me when available
      </button>
    );
  }

  const submit = () => {
    const e = email.trim(), p = phone.trim();
    if (!e && !p) { toast.error("Enter your email or phone"); return; }
    if (e && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { toast.error("Enter a valid email"); return; }
    if (p && !/^\d{10}$/.test(p)) { toast.error("Enter a valid 10-digit phone"); return; }
    subscribe.mutate({ productId, email: e || undefined, phone: p || undefined, name: user?.name || undefined });
  };

  const inputCls = "w-full bg-background border-0 shadow-clay-pressed rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40";
  return (
    <div className="mt-2 p-3 rounded-2xl bg-clay-green/40 space-y-2">
      <p className="text-xs font-semibold text-clay-brown">Get an email & WhatsApp alert when it's back:</p>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={inputCls} />
      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile (optional)" className={inputCls} />
      <button
        onClick={submit}
        disabled={subscribe.isPending}
        className="w-full flex items-center justify-center gap-2 bg-nutrigreen text-white py-2.5 rounded-full font-bold text-sm shadow-clay-btn hover:brightness-105 active:translate-y-0.5 transition-all disabled:opacity-60"
      >
        {subscribe.isPending ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />} Notify me
      </button>
    </div>
  );
}
