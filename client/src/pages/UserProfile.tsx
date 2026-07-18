import { useState, useEffect } from "react";
import { User, Package, MapPin, Settings, LogOut, Plus, Edit2, Trash2, Check, ArrowLeft, Loader2, Star, Gift, ShoppingBag, Copy, Users, FileText, CalendarClock, Pause, Play, X as XIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { UserAddress } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";
import OrderTimeline from "@/components/OrderTimeline";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { openGSTInvoice } from "@/components/GSTInvoice";

type Tab = "profile" | "orders" | "subscriptions" | "addresses" | "referral" | "loyalty" | "settings";

interface Order {
  orderId: string;
  total: number;
  date: string;
  status: string;
  items: { name: string; qty: number; price: number; image?: string }[];
}

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh",
];

const statusColor: Record<string, string> = {
  pending: "bg-clay-butter text-clay-brown",
  placed: "bg-clay-butter text-clay-brown",
  confirmed: "bg-clay-peach text-clay-brown",
  processing: "bg-clay-peach text-clay-brown",
  shipped: "bg-clay-pink text-clay-brown",
  out_for_delivery: "bg-clay-pink text-clay-brown",
  delivered: "bg-clay-green text-nutrigreen",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-orange-100 text-orange-700",
};

function OrderInvoiceButton({ orderId }: { orderId: string }) {
  // Primary: download the branded GST tax-invoice PDF (same file emailed / sent
  // on WhatsApp). Secondary: quick HTML view/print via getGSTInvoice.
  const pdfMut = trpc.customer.getInvoiceUrl.useMutation({
    onSuccess: ({ url }: { url: string }) => { if (url) window.open(url, "_blank", "noopener"); },
    onError: (e: { message?: string }) => toast.error(e.message || "Could not generate invoice"),
  });
  const [viewClicked, setViewClicked] = useState(false);
  const invoiceQuery = trpc.customer.getGSTInvoice.useQuery(
    { orderId },
    { enabled: viewClicked, retry: false }
  );
  useEffect(() => {
    if (viewClicked && invoiceQuery.data) {
      openGSTInvoice(invoiceQuery.data as any);
      setViewClicked(false);
    }
  }, [viewClicked, invoiceQuery.data]);

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        onClick={() => pdfMut.mutate({ orderId })}
        disabled={pdfMut.isPending}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-nutrigreen bg-clay-green px-3 py-1.5 rounded-lg hover:brightness-95 active:translate-y-0.5 transition-all disabled:opacity-50"
      >
        <FileText size={12} />
        {pdfMut.isPending ? "Preparing…" : "Download Invoice"}
      </button>
      <button
        onClick={() => setViewClicked(true)}
        disabled={invoiceQuery.isLoading}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-nutrigreen px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {invoiceQuery.isLoading ? "Loading…" : "View"}
      </button>
    </div>
  );
}

function ReferralTab() {
  const [copied, setCopied] = useState(false);

  const { data: referralData, isLoading: codeLoading } = trpc.referral.getMyCode.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.referral.getStats.useQuery();

  const code = referralData?.code || "";
  const shareLink = referralData?.shareLink || "";
  const shareMsg = `Hey! Use my code ${code} to shop premium dry fruits on Foodondoor and get great deals! ${shareLink}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMsg)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Share link copied!");
  };

  if (codeLoading) {
    return (
      <div className="bg-card rounded-3xl shadow-clay p-6 text-center py-12">
        <Loader2 size={32} className="text-green-400 mx-auto mb-3 animate-spin" />
        <p className="text-muted-foreground/70 text-sm">Loading your referral code...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Referral Code Card */}
      <div className="bg-gradient-to-r from-nutrigreen/10 to-emerald-50 rounded-3xl p-6 shadow-clay">
        <div className="flex items-center gap-2 mb-1">
          <Gift size={22} className="text-nutrigreen" />
          <h2 className="text-lg font-bold text-foreground">Refer & Earn</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Share your code with friends. When they place their first order, you get a Rs. 50 discount coupon!
        </p>

        {/* Code display */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground/70 mb-1.5">Your Referral Code</p>
          <div className="flex items-center gap-2">
            <div className="font-mono text-xl font-bold tracking-wider bg-card px-5 py-3 rounded-xl shadow-clay-pressed flex-1 text-center text-foreground">
              {code}
            </div>
            <button
              onClick={handleCopy}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-card shadow-clay-sm hover:shadow-clay active:translate-y-0.5 active:shadow-clay-pressed transition-all"
              title="Copy code"
            >
              {copied ? <Check size={18} className="text-nutrigreen" /> : <Copy size={18} className="text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Share buttons */}
        <div className="flex gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold active:translate-y-0.5 transition-all"
            style={{ backgroundColor: "#25D366" }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.591-.813-6.348-2.18l-.442-.352-3.276 1.098 1.098-3.276-.352-.442A9.935 9.935 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
            Share via WhatsApp
          </a>
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card shadow-clay-sm text-sm font-semibold text-foreground hover:shadow-clay active:translate-y-0.5 active:shadow-clay-pressed transition-all"
          >
            <Copy size={14} />
            Copy Link
          </button>
        </div>
      </div>

      {/* Stats Card */}
      <div className="bg-card rounded-3xl shadow-clay p-6">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <Users size={16} className="text-nutrigreen" />
          Your Referral Stats
        </h3>
        {statsLoading ? (
          <div className="text-center py-6">
            <Loader2 size={24} className="text-green-400 mx-auto animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-clay-green rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-nutrigreen">{stats?.totalReferrals ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Friends Referred</p>
            </div>
            <div className="bg-clay-peach rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-nutrigreen">{stats?.completed ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Completed</p>
            </div>
            <div className="bg-clay-butter rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-nutrigreen">Rs.{stats?.rewardsEarned ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Earned</p>
            </div>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-card rounded-3xl shadow-clay p-6">
        <h3 className="text-sm font-bold text-foreground mb-4">How It Works</h3>
        <div className="space-y-3">
          {[
            { step: "1", text: "Share your unique referral code with friends" },
            { step: "2", text: "Your friend visits Foodondoor using your link" },
            { step: "3", text: "When they place their first order, you get a Rs. 50 coupon!" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-nutrigreen text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {item.step}
              </div>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UserProfile() {
  const { user, isLoggedIn, setIsLoginOpen, logout, updateProfile, addAddress, updateAddress, deleteAddress } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  // Parse tab from URL hash/query
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") as Tab;
    if (tab && ["profile", "orders", "subscriptions", "addresses", "referral", "loyalty", "settings"].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Load orders from DB via tRPC
  const { data: dbOrders, isLoading: ordersLoading } = trpc.customer.getOrders.useQuery(
    undefined,
    { enabled: !!user?.customerId }
  );

  // Load loyalty data via tRPC
  const { data: loyaltyBalance } = trpc.loyalty.getBalance.useQuery(
    undefined,
    { enabled: !!user?.customerId }
  );
  const { data: loyaltyHistory, isLoading: loyaltyLoading } = trpc.loyalty.getHistory.useQuery(
    undefined,
    { enabled: !!user?.customerId && activeTab === "loyalty" }
  );

  // Load subscriptions via tRPC
  const { data: subscriptions = [], refetch: refetchSubs } = trpc.subscription.list.useQuery(
    undefined,
    { enabled: !!user?.customerId }
  );
  const updateSubMut = trpc.subscription.update.useMutation({
    onSuccess: () => { refetchSubs(); toast.success("Subscription updated"); },
    onError: (err) => toast.error(err.message),
  });
  const cancelSubMut = trpc.subscription.cancel.useMutation({
    onSuccess: () => { refetchSubs(); toast.success("Subscription cancelled"); },
    onError: (err) => toast.error(err.message),
  });

  const orders: Order[] = (dbOrders ?? []).map((o: any) => ({
    orderId: o.id,
    total: o.total,
    date: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
    status: o.status || "placed",
    items: Array.isArray(o.items) ? o.items.map((item: any) => ({
      name: item.name,
      qty: item.quantity,
      price: item.price,
      image: item.image,
    })) : [],
  }));

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      setIsLoginOpen(true);
      navigate("/");
    }
  }, [isLoggedIn]);

  // Profile edit state
  const [editProfile, setEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });

  // Address state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [addrForm, setAddrForm] = useState({
    name: "", phone: "", flat: "", area: "", city: "", state: "", pincode: "", isDefault: false
  });

  const updateProfileMut = trpc.customer.updateProfile.useMutation();
  const handleSaveProfile = async () => {
    if (!user) return;
    const email = profileForm.email.trim();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast.error("Please enter a valid email"); return; }
    try {
      // Persist to the DB so it survives across sessions/devices
      await updateProfileMut.mutateAsync({
        name: profileForm.name.trim() || undefined,
        email: email || undefined,
      });
      updateProfile({ name: profileForm.name, email }); // update local session
      setEditProfile(false);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save. Try again.");
    }
  };

  const handleAddressSubmit = () => {
    if (!addrForm.name || !addrForm.phone || !addrForm.flat || !addrForm.city || !addrForm.state || !addrForm.pincode) {
      alert("Please fill all required fields");
      return;
    }
    if (editingAddress) {
      updateAddress(editingAddress.id, addrForm);
    } else {
      // Create a temporary local address with a negative id (will be replaced by DB id on next login)
      const tempAddr: UserAddress = {
        id: -(Date.now()),
        customerId: user?.customerId || 0,
        ...addrForm,
      };
      addAddress(tempAddr);
    }
    setShowAddressForm(false);
    setEditingAddress(null);
    setAddrForm({ name: "", phone: "", flat: "", area: "", city: "", state: "", pincode: "", isDefault: false });
  };

  const openEditAddress = (addr: UserAddress) => {
    setEditingAddress(addr);
    setAddrForm({ name: addr.name, phone: addr.phone, flat: addr.flat, area: addr.area ?? "", city: addr.city, state: addr.state, pincode: addr.pincode, isDefault: addr.isDefault });
    setShowAddressForm(true);
  };

  if (!isLoggedIn || !user) return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "My Profile", icon: <User size={18} /> },
    { id: "orders", label: "My Orders", icon: <Package size={18} /> },
    { id: "subscriptions", label: "Subscriptions", icon: <CalendarClock size={18} /> },
    { id: "loyalty", label: "My Points", icon: <Star size={18} /> },
    { id: "addresses", label: "Addresses", icon: <MapPin size={18} /> },
    { id: "referral", label: "Refer & Earn", icon: <Gift size={18} /> },
    { id: "settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO title="My Account" description="Manage your Foodondoor account, orders and addresses." noIndex />
      <Header />
      <div className="container py-8">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="mb-6 flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-muted-foreground/70 hover:text-muted-foreground transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Account</h1>
              <p className="text-muted-foreground text-sm">+91 {user.mobile}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <div className="w-full md:w-56 flex-shrink-0">
              <div className="bg-card rounded-3xl shadow-clay overflow-hidden">
                {/* Avatar */}
                <div className="bg-gradient-to-br from-[#2e7d32] to-[#43a047] p-5 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-2">
                    {user.name
                      ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                      : user.mobile.slice(-2)}
                  </div>
                  <p className="text-white font-semibold text-sm">{user.name || "Foodondoor User"}</p>
                  <p className="text-white/70 text-xs">+91 {user.mobile}</p>
                </div>

                <nav className="py-2">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        activeTab === tab.id
                          ? "bg-clay-green text-primary font-semibold border-r-2 border-primary"
                          : "text-muted-foreground hover:bg-background"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                  <button
                    onClick={() => { logout(); navigate("/"); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-border/60 mt-1"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </nav>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">

              {/* PROFILE TAB */}
              {activeTab === "profile" && (
                <div className="bg-card rounded-3xl shadow-clay p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-foreground">Personal Information</h2>
                    {!editProfile && (
                      <button
                        onClick={() => { setEditProfile(true); setProfileForm({ name: user.name || "", email: user.email || "" }); }}
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                    )}
                  </div>

                  {editProfile ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                          className="w-full border-0 bg-background shadow-clay-pressed rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                          placeholder="Enter your name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Email (Optional)</label>
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                          className="w-full border-0 bg-background shadow-clay-pressed rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                          placeholder="email@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Mobile Number</label>
                        <div className="flex items-center border-0 bg-background shadow-clay-pressed rounded-2xl px-3 py-2.5 bg-background">
                          <span className="text-sm text-muted-foreground">🇮🇳 +91 {user.mobile}</span>
                          <span className="ml-2 text-xs text-muted-foreground/70">(cannot be changed)</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={handleSaveProfile} className="bg-primary text-primary-foreground shadow-clay-btn px-5 py-2 rounded-lg text-sm font-medium hover:brightness-105 transition-colors">
                          Save
                        </button>
                        <button onClick={() => setEditProfile(false)} className="bg-card shadow-clay-sm text-muted-foreground px-5 py-2 rounded-lg text-sm hover:bg-background transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground/70 mb-1">Name</p>
                          <p className="text-sm font-medium text-foreground">{user.name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground/70 mb-1">Mobile</p>
                          <p className="text-sm font-medium text-foreground">+91 {user.mobile}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground/70 mb-1">Email</p>
                          <p className="text-sm font-medium text-foreground">{user.email || "—"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ORDERS TAB */}
              {activeTab === "orders" && (
                <div className="bg-card rounded-3xl shadow-clay p-6">
                  <h2 className="text-lg font-bold text-foreground mb-5">My Orders</h2>
                  {ordersLoading ? (
                    <div className="text-center py-12">
                      <Loader2 size={32} className="text-green-400 mx-auto mb-3 animate-spin" />
                      <p className="text-muted-foreground/70 text-sm">Loading your orders...</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package size={48} className="text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">No orders found</p>
                      <p className="text-muted-foreground/70 text-sm mt-1">Start shopping now!</p>
                      <button
                        onClick={() => navigate("/")}
                        className="inline-block mt-4 bg-primary text-primary-foreground shadow-clay-btn px-6 py-2 rounded-lg text-sm font-medium hover:brightness-105 transition-colors"
                      >
                        Shop Now
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map(order => (
                        <div key={order.orderId} className="border-0 shadow-clay-sm rounded-xl p-4 hover:border-transparent transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-semibold text-foreground text-sm">#{order.orderId}</p>
                              <p className="text-xs text-muted-foreground/70">
                                {new Date(order.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColor[order.status] || "bg-muted text-muted-foreground"}`}>
                                {order.status}
                              </span>
                              <p className="text-sm font-bold text-foreground mt-1">₹{order.total}</p>
                            </div>
                          </div>
                          {/* Order tracking timeline */}
                          <div className="mt-3 mb-2">
                            <OrderTimeline status={order.status} />
                          </div>
                          {order.items && order.items.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {order.items.slice(0, 3).map((item, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-background rounded-lg px-2 py-1">
                                  {item.image && <img src={item.image} alt={item.name} className="w-6 h-6 object-cover rounded" loading="lazy" />}
                                  <span className="text-xs text-muted-foreground">{item.name} × {item.qty}</span>
                                </div>
                              ))}
                              {order.items.length > 3 && (
                                <span className="text-xs text-muted-foreground/70">+{order.items.length - 3} more</span>
                              )}
                            </div>
                          )}
                          <OrderInvoiceButton orderId={order.orderId} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUBSCRIPTIONS TAB */}
              {activeTab === "subscriptions" && (
                <div className="bg-card rounded-3xl shadow-clay p-6">
                  <h2 className="text-lg font-bold text-foreground mb-5">My Subscriptions</h2>
                  {(subscriptions as any[]).length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarClock size={48} className="text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">No active subscriptions</p>
                      <p className="text-muted-foreground/70 text-sm mt-1">Subscribe & save 10% on your favorite products!</p>
                      <button
                        onClick={() => navigate("/")}
                        className="inline-block mt-4 bg-primary text-primary-foreground shadow-clay-btn px-6 py-2 rounded-lg text-sm font-medium hover:brightness-105 transition-colors"
                      >
                        Browse Products
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(subscriptions as any[]).map((sub: any) => {
                        const statusColors: Record<string, string> = {
                          active: "bg-clay-green text-nutrigreen",
                          paused: "bg-clay-butter text-clay-brown",
                          cancelled: "bg-red-100 text-red-700",
                        };
                        const variants = ["250g", "500g", "1kg"];
                        const variantLabel = variants[sub.variantIdx] || "250g";
                        const basePrice = Math.round(sub.productPrice || 0); // productPrice is already in rupees
                        const multipliers = [1, 1.85, 3.5];
                        const variantPrice = Math.round(basePrice * (multipliers[sub.variantIdx] || 1));
                        const discountedPrice = Math.round(variantPrice * (1 - (sub.discountPercent || 10) / 100));

                        return (
                          <div key={sub.id} className="border-0 shadow-clay-sm rounded-xl p-4">
                            <div className="flex gap-3">
                              {sub.productImage && (
                                <img src={sub.productImage} alt={sub.productName} className="w-16 h-16 object-contain rounded-lg bg-background p-1" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-semibold text-foreground text-sm line-clamp-1">{sub.productName}</p>
                                    <p className="text-xs text-muted-foreground">{variantLabel} x {sub.quantity}</p>
                                  </div>
                                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize flex-shrink-0 ${statusColors[sub.status] || "bg-muted text-muted-foreground"}`}>
                                    {sub.status}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <span>Every {sub.frequencyDays} days</span>
                                  <span>|</span>
                                  <span className="line-through">₹{variantPrice}</span>
                                  <span className="font-bold text-nutrigreen">₹{discountedPrice}</span>
                                </div>

                                {sub.nextDeliveryDate && sub.status === "active" && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Next delivery: {new Date(sub.nextDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                  </p>
                                )}

                                {sub.status !== "cancelled" && (
                                  <div className="flex items-center gap-2 mt-3">
                                    {sub.status === "active" ? (
                                      <button
                                        onClick={() => updateSubMut.mutate({ id: sub.id, status: "paused" })}
                                        disabled={updateSubMut.isPending}
                                        className="flex items-center gap-1 text-xs bg-clay-butter text-clay-brown px-3 py-1.5 rounded-lg hover:brightness-95 transition-colors"
                                      >
                                        <Pause size={12} /> Pause
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => updateSubMut.mutate({ id: sub.id, status: "active" })}
                                        disabled={updateSubMut.isPending}
                                        className="flex items-center gap-1 text-xs bg-clay-green text-nutrigreen px-3 py-1.5 rounded-lg hover:brightness-95 transition-colors"
                                      >
                                        <Play size={12} /> Resume
                                      </button>
                                    )}
                                    <select
                                      value={sub.frequencyDays}
                                      onChange={e => updateSubMut.mutate({ id: sub.id, frequencyDays: Number(e.target.value) })}
                                      className="text-xs border-0 bg-background shadow-clay-pressed rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring/40"
                                    >
                                      <option value={15}>Every 15 days</option>
                                      <option value={30}>Every 30 days</option>
                                      <option value={60}>Every 60 days</option>
                                      <option value={90}>Every 90 days</option>
                                    </select>
                                    <button
                                      onClick={() => {
                                        if (confirm("Cancel this subscription?")) {
                                          cancelSubMut.mutate({ id: sub.id });
                                        }
                                      }}
                                      disabled={cancelSubMut.isPending}
                                      className="flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors ml-auto"
                                    >
                                      <XIcon size={12} /> Cancel
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* LOYALTY POINTS TAB */}
              {activeTab === "loyalty" && (
                <div className="space-y-5">
                  {/* Points Balance Card */}
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-5 shadow-clay">
                    <div className="flex items-center gap-2 mb-3">
                      <Star size={20} className="text-amber-500 fill-amber-500" />
                      <h2 className="text-lg font-bold text-foreground">Loyalty Points</h2>
                    </div>
                    <div className="flex items-end gap-3">
                      <p className="text-3xl font-bold font-serif text-foreground">{loyaltyBalance?.balance ?? 0}</p>
                      <p className="text-sm text-muted-foreground mb-1">points</p>
                    </div>
                    <p className="text-sm text-amber-700 mt-1 font-medium">
                      Worth ₹{loyaltyBalance?.value ?? 0}
                    </p>
                  </div>

                  {/* How to Earn */}
                  <div className="bg-card rounded-xl shadow-clay-sm p-5">
                    <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
                      <Gift size={16} className="text-amber-500" />
                      How to Earn Points
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <ShoppingBag size={14} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">Shop & Earn</p>
                          <p className="text-xs text-muted-foreground">Every ₹1 spent = 1 point</p>
                        </div>
                        <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">1 pt/₹</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Edit2 size={14} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">Write a Review</p>
                          <p className="text-xs text-muted-foreground">Share your experience</p>
                        </div>
                        <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">20 pts</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Users size={14} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">Refer a Friend</p>
                          <p className="text-xs text-muted-foreground">When they complete their first order</p>
                        </div>
                        <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">100 pts</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border/40">
                      <p className="text-xs text-muted-foreground">
                        100 points = ₹10 discount. Min redemption: 100 points. Max per order: 500 points (₹50).
                      </p>
                    </div>
                  </div>

                  {/* Transaction History */}
                  <div className="bg-card rounded-xl shadow-clay-sm p-5">
                    <h3 className="font-bold text-foreground text-sm mb-4">Points History</h3>
                    {loyaltyLoading ? (
                      <div className="text-center py-8">
                        <Loader2 size={24} className="text-amber-400 mx-auto mb-2 animate-spin" />
                        <p className="text-muted-foreground/70 text-sm">Loading history...</p>
                      </div>
                    ) : !loyaltyHistory || loyaltyHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <Star size={36} className="text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">No points activity yet</p>
                        <p className="text-muted-foreground/70 text-xs mt-1">Start shopping to earn points!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {loyaltyHistory.map((tx: any) => (
                          <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                            <div className="flex items-center gap-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                                tx.type === "earned" ? "bg-green-100 text-green-700" :
                                tx.type === "redeemed" ? "bg-blue-100 text-blue-700" :
                                tx.type === "bonus" ? "bg-amber-100 text-amber-700" :
                                "bg-gray-100 text-gray-600"
                              }`}>
                                {tx.type}
                              </span>
                              <div>
                                <p className="text-sm text-foreground">{tx.description}</p>
                                <p className="text-xs text-muted-foreground/70">
                                  {new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                              </div>
                            </div>
                            <p className={`text-sm font-bold ${tx.points > 0 ? "text-green-600" : "text-red-500"}`}>
                              {tx.points > 0 ? "+" : ""}{tx.points}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ADDRESSES TAB */}
              {activeTab === "addresses" && (
                <div className="bg-card rounded-3xl shadow-clay p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-foreground">Saved Addresses</h2>
                    <button
                      onClick={() => {
                        setShowAddressForm(true);
                        setEditingAddress(null);
                        setAddrForm({ name: user.name || "", phone: user.mobile, flat: "", area: "", city: "", state: "", pincode: "", isDefault: user.addresses.length === 0 });
                      }}
                      className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground shadow-clay-btn px-3 py-1.5 rounded-lg hover:brightness-105 transition-colors"
                    >
                      <Plus size={14} /> Add New
                    </button>
                  </div>

                  {showAddressForm && (
                    <div className="border border-transparent rounded-xl p-4 mb-4 bg-clay-green">
                      <h3 className="font-semibold text-foreground mb-3 text-sm">
                        {editingAddress ? "Edit Address" : "Add New Address"}
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name *</label>
                          <input type="text" value={addrForm.name} onChange={e => setAddrForm(p => ({ ...p, name: e.target.value }))} className="w-full border-0 bg-background shadow-clay-pressed rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 bg-white" placeholder="Full Name" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Mobile *</label>
                          <input type="tel" value={addrForm.phone} onChange={e => setAddrForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} className="w-full border-0 bg-background shadow-clay-pressed rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 bg-white" placeholder="10 digits" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Flat/House No., Building *</label>
                          <input type="text" value={addrForm.flat} onChange={e => setAddrForm(p => ({ ...p, flat: e.target.value }))} className="w-full border-0 bg-background shadow-clay-pressed rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 bg-white" placeholder="Flat No., Building Name" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Area, Street</label>
                          <input type="text" value={addrForm.area} onChange={e => setAddrForm(p => ({ ...p, area: e.target.value }))} className="w-full border-0 bg-background shadow-clay-pressed rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 bg-white" placeholder="Area, Street, Landmark" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">City *</label>
                          <input type="text" value={addrForm.city} onChange={e => setAddrForm(p => ({ ...p, city: e.target.value }))} className="w-full border-0 bg-background shadow-clay-pressed rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 bg-white" placeholder="City" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Pincode *</label>
                          <input type="tel" value={addrForm.pincode} onChange={e => setAddrForm(p => ({ ...p, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} className="w-full border-0 bg-background shadow-clay-pressed rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 bg-white" placeholder="6 digits" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-muted-foreground mb-1">State *</label>
                          <select value={addrForm.state} onChange={e => setAddrForm(p => ({ ...p, state: e.target.value }))} className="w-full border-0 bg-background shadow-clay-pressed rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 bg-white">
                            <option value="">Select State</option>
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={addrForm.isDefault} onChange={e => setAddrForm(p => ({ ...p, isDefault: e.target.checked }))} className="w-4 h-4 accent-[#43a047]" />
                            <span className="text-sm text-foreground">Set as default address</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-3">
                        <button onClick={handleAddressSubmit} className="bg-primary text-primary-foreground shadow-clay-btn px-5 py-2 rounded-lg text-sm font-medium hover:brightness-105 transition-colors">
                          Save Address
                        </button>
                        <button onClick={() => { setShowAddressForm(false); setEditingAddress(null); }} className="bg-card shadow-clay-sm text-muted-foreground px-5 py-2 rounded-lg text-sm hover:bg-background transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {user.addresses.length === 0 && !showAddressForm ? (
                    <div className="text-center py-10">
                      <MapPin size={40} className="text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">No saved addresses yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {user.addresses.map(addr => (
                        <div key={addr.id} className={`border rounded-xl p-4 ${addr.isDefault ? "border-nutrigreen bg-clay-green" : "border-border/60"}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-foreground text-sm">{addr.name}</p>
                                {addr.isDefault && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Check size={10} /> Default
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{addr.flat}{addr.area ? `, ${addr.area}` : ""}</p>
                              <p className="text-sm text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">📞 +91 {addr.phone}</p>
                            </div>
                            <div className="flex gap-2 ml-3">
                              <button onClick={() => openEditAddress(addr)} className="p-1.5 text-muted-foreground/70 hover:text-primary transition-colors">
                                <Edit2 size={15} />
                              </button>
                              <button onClick={() => deleteAddress(addr.id)} className="p-1.5 text-muted-foreground/70 hover:text-red-500 transition-colors">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* REFERRAL TAB */}
              {activeTab === "referral" && <ReferralTab />}

              {/* SETTINGS TAB */}
              {activeTab === "settings" && (
                <div className="bg-card rounded-3xl shadow-clay p-6">
                  <h2 className="text-lg font-bold text-foreground mb-5">Account Settings</h2>
                  <div className="space-y-4">
                    <div className="border-0 shadow-clay-sm rounded-xl p-4">
                      <h3 className="font-semibold text-foreground text-sm mb-3">Notifications</h3>
                      {[
                        { label: "Order updates (SMS)", desc: "Order place, shipped, delivered" },
                        { label: "Offers & Deals (SMS)", desc: "Exclusive discounts and new arrivals" },
                      ].map(item => (
                        <label key={item.label} className="flex items-center justify-between py-2 cursor-pointer">
                          <div>
                            <p className="text-sm text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground/70">{item.desc}</p>
                          </div>
                          <div className="w-10 h-5 bg-nutrigreen rounded-full relative">
                            <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="border border-red-100 rounded-xl p-4">
                      <h3 className="font-semibold text-red-600 text-sm mb-2">Danger Zone</h3>
                      <p className="text-xs text-muted-foreground mb-3">Deleting your account will permanently remove all your data.</p>
                      <button
                        onClick={() => { logout(); navigate("/"); }}
                        className="text-sm text-red-500 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
