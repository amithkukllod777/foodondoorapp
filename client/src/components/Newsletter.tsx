import { useState } from "react";
import { MessageCircle, Mail, Send, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useFacebookCapi } from "@/hooks/useFacebookCapi";
import { toast } from "sonner";

type Tab = "whatsapp" | "email";

export default function Newsletter() {
  const [tab, setTab] = useState<Tab>("whatsapp");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailName, setEmailName] = useState("");
  const [subscribedWa, setSubscribedWa] = useState(false);
  const [subscribedEmail, setSubscribedEmail] = useState(false);
  const fbCapi = useFacebookCapi();

  const waMutation = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => {
      setSubscribedWa(true);
      setPhone("");
      setName("");
      fbCapi.trackLead({ leadType: "whatsapp_newsletter" });
      toast.success("You're subscribed! Expect exclusive offers on WhatsApp 🎉");
    },
    onError: (e) => {
      if (e.message.includes("already subscribed")) {
        toast.info("You're already subscribed! We'll keep sending you great offers.");
      } else {
        toast.error("Subscription failed. Please try again.");
      }
    },
  });

  const emailMutation = trpc.newsletter.subscribeEmail.useMutation({
    onSuccess: () => {
      setSubscribedEmail(true);
      setEmail("");
      setEmailName("");
      fbCapi.trackLead({ leadType: "email_newsletter" });
      toast.success("You're subscribed! Check your inbox for exclusive offers 📧");
    },
    onError: (e) => {
      if (e.message.includes("already") || e.message.includes("duplicate")) {
        toast.info("You're already subscribed! We'll keep sending you great offers.");
      } else {
        toast.error("Subscription failed. Please try again.");
      }
    },
  });

  const handleWaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    waMutation.mutate({ phone: cleaned, name: name.trim() || undefined });
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }
    emailMutation.mutate({ email: trimmed, name: emailName.trim() || undefined });
  };

  const subscribed = tab === "whatsapp" ? subscribedWa : subscribedEmail;

  return (
    <section className="py-12 bg-clay-peach/60">
      <div className="container max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Get Exclusive Offers & Updates
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Join 10,000+ health enthusiasts. Get early access to sales, new arrivals, and healthy recipes.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setTab("whatsapp")}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              tab === "whatsapp"
                ? "bg-card text-foreground shadow-clay"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle size={14} />
            WhatsApp
          </button>
          <button
            onClick={() => setTab("email")}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              tab === "email"
                ? "bg-card text-foreground shadow-clay"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail size={14} />
            Email
          </button>
        </div>

        {subscribed ? (
          <div className="bg-card rounded-3xl shadow-clay p-8 text-center">
            <CheckCircle2 size={48} className="text-nutrigreen mx-auto mb-3" />
            <p className="text-foreground font-bold text-lg mb-1">You're all set! 🎉</p>
            <p className="text-muted-foreground text-sm">
              {tab === "whatsapp"
                ? "Watch for exclusive Foodondoor deals on your WhatsApp."
                : "Watch your inbox for exclusive Foodondoor deals and offers."}
            </p>
          </div>
        ) : tab === "whatsapp" ? (
          <form onSubmit={handleWaSubmit} className="bg-card rounded-3xl shadow-clay p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Your Name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya"
                  className="w-full bg-background rounded-2xl shadow-clay-pressed border-0 text-foreground placeholder:text-muted-foreground px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">WhatsApp Number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className="w-full bg-background rounded-2xl shadow-clay-pressed border-0 text-foreground placeholder:text-muted-foreground px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={waMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3.5 rounded-full shadow-clay-btn transition-all hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed disabled:opacity-60 text-sm"
            >
              <Send size={16} />
              {waMutation.isPending ? "Subscribing..." : "Subscribe on WhatsApp"}
            </button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              No spam. Unsubscribe anytime. We respect your privacy.
            </p>
          </form>
        ) : (
          <form onSubmit={handleEmailSubmit} className="bg-card rounded-3xl shadow-clay p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Your Name (optional)</label>
                <input
                  type="text"
                  value={emailName}
                  onChange={(e) => setEmailName(e.target.value)}
                  placeholder="e.g. Priya"
                  className="w-full bg-background rounded-2xl shadow-clay-pressed border-0 text-foreground placeholder:text-muted-foreground px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-background rounded-2xl shadow-clay-pressed border-0 text-foreground placeholder:text-muted-foreground px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={emailMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3.5 rounded-full shadow-clay-btn transition-all hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed disabled:opacity-60 text-sm"
            >
              <Mail size={16} />
              {emailMutation.isPending ? "Subscribing..." : "Subscribe via Email"}
            </button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              No spam. Unsubscribe anytime. We respect your privacy.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
