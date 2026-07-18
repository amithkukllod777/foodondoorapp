import { useState, useRef, useEffect } from "react";
import { X, Phone, Shield, ArrowLeft, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type Step = "mobile" | "otp" | "name";

export default function LoginModal() {
  const { isLoginOpen, setIsLoginOpen, login } = useAuth();
  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [pendingProfile, setPendingProfile] = useState<{ id: number; phone: string; name?: string | null; email?: string | null } | null>(null);

  const otpRef0 = useRef<HTMLInputElement>(null);
  const otpRef1 = useRef<HTMLInputElement>(null);
  const otpRef2 = useRef<HTMLInputElement>(null);
  const otpRef3 = useRef<HTMLInputElement>(null);
  const otpRefs = [otpRef0, otpRef1, otpRef2, otpRef3];

  const sendOtpMutation = trpc.otp.send.useMutation();
  const verifyOtpMutation = trpc.otp.verify.useMutation();
  const updateProfileMutation = trpc.customer.updateProfile.useMutation();

  useEffect(() => {
    if (!isLoginOpen) {
      const t = setTimeout(() => {
        setStep("mobile");
        setMobile("");
        setOtp(["", "", "", ""]);
        setName("");
        setEmail("");
        setError("");
        setPendingProfile(null);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isLoginOpen]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleSendOtp = async () => {
    if (mobile.length !== 10) { setError("Please enter a valid 10-digit mobile number"); return; }
    setError("");
    setLoading(true);
    try {
      await sendOtpMutation.mutateAsync({ mobile });
      setLoading(false);
      setStep("otp");
      setResendTimer(30);
      setTimeout(() => otpRef0.current?.focus(), 100);
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to send OTP. Please try again.");
    }
  };

  const handleResendOtp = async () => {
    setOtp(["", "", "", ""]);
    setError("");
    setLoading(true);
    try {
      await sendOtpMutation.mutateAsync({ mobile });
      setLoading(false);
      setResendTimer(30);
      setTimeout(() => otpRef0.current?.focus(), 100);
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");
    if (value && index < 3) otpRefs[index + 1].current?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs[index - 1].current?.focus();
  };

  const handleVerifyOtp = async () => {
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 4) { setError("Please enter the 4-digit OTP"); return; }
    setError("");
    setLoading(true);
    try {
      // verifyOtp now returns profile + addresses in one shot — no separate
      // getOrCreate call needed (avoids batch-cookie race: cookie set by verify
      // wouldn't be available in the same batched HTTP request).
      const result = await verifyOtpMutation.mutateAsync({ mobile, otp: enteredOtp });
      const profile = result.profile;
      const savedAddresses = result.addresses ?? [];

      setPendingProfile(profile);
      setLoading(false);

      // If customer has no name yet, ask for it
      if (!profile.name) {
        setStep("name");
      } else {
        completeLogin(profile, profile.name, undefined, savedAddresses);
      }
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Incorrect OTP. Please try again.");
    }
  };

  const completeLogin = (
    profile: { id: number; phone: string; name?: string | null; email?: string | null },
    displayName?: string,
    displayEmail?: string,
    savedAddresses: any[] = [],
  ) => {
    login({
      mobile: profile.phone,
      customerId: profile.id,
      name: displayName || profile.name || undefined,
      email: displayEmail || profile.email || undefined,
      addresses: savedAddresses,
    });
    setIsLoginOpen(false);
  };

  const handleSetName = async () => {
    if (!pendingProfile) return;
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (name.trim() || trimmedEmail) {
        await updateProfileMutation.mutateAsync({
          name: name.trim() || undefined,
          email: trimmedEmail || undefined,
        });
      }
      await completeLogin(pendingProfile, name.trim() || undefined, trimmedEmail || undefined);
    } catch {
      await completeLogin(pendingProfile, name.trim() || undefined, trimmedEmail || undefined);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoginOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-clay-brown/40 backdrop-blur-sm" onClick={() => setIsLoginOpen(false)} />
      <div className="relative bg-card rounded-3xl shadow-clay-lg w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#2e7d32] to-[#43a047] px-6 pt-8 pb-10 text-primary-foreground text-center relative">
          <button onClick={() => setIsLoginOpen(false)} className="absolute top-4 right-4 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
            <X size={20} />
          </button>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            {step === "mobile" && <Phone size={26} />}
            {step === "otp" && <Shield size={26} />}
            {step === "name" && <CheckCircle size={26} />}
          </div>
          <h2 className="text-xl font-bold">
            {step === "mobile" && "Login / Register"}
            {step === "otp" && "Verify OTP"}
            {step === "name" && "Welcome! 🎉"}
          </h2>
          <p className="text-primary-foreground/80 text-sm mt-1">
            {step === "mobile" && "Welcome to Nutriwow"}
            {step === "otp" && `OTP sent to WhatsApp +91 ${mobile}`}
            {step === "name" && "Tell us about yourself"}
          </p>
        </div>

        {/* Wave */}
        <div className="h-5 bg-gradient-to-br from-[#2e7d32] to-[#43a047] relative">
          <svg viewBox="0 0 400 20" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0,20 Q100,0 200,10 Q300,20 400,5 L400,20 Z" fill="white" />
          </svg>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-2">
          {step === "mobile" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Mobile Number</label>
                <div className="flex items-center bg-background shadow-clay-pressed rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-ring/40 transition-all">
                  <div className="flex items-center gap-1.5 px-3 py-3 bg-muted flex-shrink-0">
                    <span className="text-lg">🇮🇳</span>
                    <span className="text-sm font-semibold text-foreground">+91</span>
                  </div>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={e => { setMobile(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                    placeholder="10-digit number"
                    className="flex-1 px-3 py-3 text-sm focus:outline-none bg-transparent"
                    autoFocus
                    inputMode="numeric"
                  />
                </div>
                {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
              </div>
              <button onClick={handleSendOtp} disabled={loading || mobile.length !== 10}
                className="w-full bg-primary text-primary-foreground py-3 rounded-full font-semibold text-sm shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending OTP...</span> : "📱 Send OTP on WhatsApp"}
              </button>
              <p className="text-xs text-center text-muted-foreground/70">
                By logging in, you agree to our <a href="#" className="text-primary underline">Terms</a> and <a href="#" className="text-primary underline">Privacy Policy</a>
              </p>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-3 text-center">Enter 4-digit OTP</label>
                <div className="flex gap-3 justify-center">
                  {otp.map((digit, i) => (
                    <input key={i} ref={otpRefs[i]} type="tel" inputMode="numeric" maxLength={1} value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className={`w-12 h-12 text-center text-xl font-bold border-0 rounded-2xl focus:outline-none transition-all ${digit ? "bg-clay-green text-nutrigreen shadow-clay-pressed" : "bg-background shadow-clay-pressed focus:ring-2 focus:ring-ring/40"}`}
                    />
                  ))}
                </div>
                {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
                <p className="text-xs text-center text-muted-foreground/70 mt-2">📱 OTP sent via WhatsApp to +91 {mobile}</p>
              </div>
              <button onClick={handleVerifyOtp} disabled={loading || otp.join("").length !== 4}
                className="w-full bg-primary text-primary-foreground py-3 rounded-full font-semibold text-sm shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</span> : "Verify OTP"}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button onClick={() => { setStep("mobile"); setOtp(["","","",""]); setError(""); }}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <ArrowLeft size={14} /> Change Number
                </button>
                {resendTimer > 0 ? (
                  <span className="text-muted-foreground/70 text-xs">Resend in {resendTimer}s</span>
                ) : (
                  <button onClick={handleResendOtp} disabled={loading} className="text-primary font-medium hover:underline text-xs disabled:opacity-50">Resend OTP</button>
                )}
              </div>
            </div>
          )}

          {step === "name" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Your Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSetName()}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-background border-0 shadow-clay-pressed rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email <span className="text-muted-foreground/60 font-normal">(for order updates & offers)</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSetName()}
                  placeholder="you@email.com"
                  className="w-full bg-background border-0 shadow-clay-pressed rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all"
                />
              </div>
              <button onClick={handleSetName} disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-full font-semibold text-sm shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all disabled:opacity-50">
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span> : ((name.trim() || email.trim()) ? "Continue" : "Skip")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
