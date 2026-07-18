import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, ArrowLeft, KeyRound, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "../../lib/trpc";

type View = "login" | "forgot" | "reset";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [view, setView] = useState<View>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const utils = trpc.useUtils();
  const login = trpc.admin.login.useMutation();

  const [resetEmail, setResetEmail] = useState("");
  const [resetMethod, setResetMethod] = useState<"email" | "whatsapp">("email");
  const requestReset = trpc.admin.requestPasswordReset.useMutation();

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const resetPassword = trpc.admin.resetPassword.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login.mutateAsync({ email: email || undefined, password });
      await utils.admin.me.invalidate();
      toast.success(`Welcome${result.name ? `, ${result.name}` : ""}!`);
      navigate("/admin");
    } catch {
      toast.error("Invalid email or password.");
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    try {
      await requestReset.mutateAsync({ email: resetEmail, method: resetMethod });
      toast.success(
        resetMethod === "email"
          ? "Reset code sent to your email."
          : "Reset code sent via WhatsApp.",
      );
      setView("reset");
    } catch {
      toast.error("Failed to send reset code. Try again.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }
    try {
      await resetPassword.mutateAsync({ email: resetEmail, code, newPassword });
      toast.success("Password reset successfully! Please login.");
      setView("login");
      setEmail(resetEmail);
      setPassword("");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Invalid or expired code.";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-nutrigreen rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-1">Nutriwow Store Management</p>
        </div>

        {view === "login" && (
          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@nutriwow.in"
                  className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-nutrigreen transition-colors"
                  autoFocus autoComplete="email" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password"
                  className="w-full pl-9 pr-10 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-nutrigreen transition-colors"
                  autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => { setView("forgot"); setResetEmail(email); }} className="text-xs text-nutrigreen hover:underline font-medium">
                Forgot Password?
              </button>
            </div>
            <button type="submit" disabled={login.isPending || !password}
              className="w-full py-3 bg-nutrigreen text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {login.isPending ? "Logging in..." : "Login to Admin Panel"}
            </button>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={handleRequestReset} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <button type="button" onClick={() => setView("login")} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-1">
              <ArrowLeft size={14} /> Back to Login
            </button>
            <div>
              <h2 className="text-base font-bold text-gray-900">Reset Password</h2>
              <p className="text-xs text-gray-500 mt-1">Enter your admin email and choose how to receive your reset code.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="your@email.com"
                  className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-nutrigreen transition-colors" autoFocus required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Send code via</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setResetMethod("email")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${resetMethod === "email" ? "border-nutrigreen bg-green-50 text-nutrigreen" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  <Send size={14} /> Email
                </button>
                <button type="button" onClick={() => setResetMethod("whatsapp")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${resetMethod === "whatsapp" ? "border-green-600 bg-green-50 text-green-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  <MessageCircle size={14} /> WhatsApp
                </button>
              </div>
            </div>
            <button type="submit" disabled={requestReset.isPending || !resetEmail}
              className="w-full py-3 bg-nutrigreen text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {requestReset.isPending ? "Sending..." : "Send Reset Code"}
            </button>
          </form>
        )}

        {view === "reset" && (
          <form onSubmit={handleResetPassword} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <button type="button" onClick={() => setView("forgot")} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-1">
              <ArrowLeft size={14} /> Back
            </button>
            <div>
              <h2 className="text-base font-bold text-gray-900">Set New Password</h2>
              <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code and choose a new password.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reset Code</label>
              <div className="relative">
                <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000"
                  className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm text-center tracking-[6px] font-mono font-bold focus:outline-none focus:border-nutrigreen transition-colors"
                  maxLength={6} autoFocus required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showNewPass ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters"
                  className="w-full pl-9 pr-10 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-nutrigreen transition-colors" minLength={6} required />
                <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
                  className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-nutrigreen transition-colors" minLength={6} required />
              </div>
            </div>
            <button type="submit" disabled={resetPassword.isPending || code.length !== 6 || !newPassword || !confirmPassword}
              className="w-full py-3 bg-nutrigreen text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {resetPassword.isPending ? "Resetting..." : "Set New Password"}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          <a href="/" className="text-nutrigreen hover:underline">Back to Store</a>
        </p>
      </div>
    </div>
  );
}
