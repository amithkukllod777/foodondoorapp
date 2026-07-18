/*
 * AdminSettings.tsx — DB-backed settings (all localStorage removed)
 * Uses trpc.settings.getAll / trpc.settings.bulkSet
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Settings, CreditCard, ShoppingCart, Users, Truck, Receipt, MapPin,
  Globe, Calendar, Bell, Code, Languages, Shield, FileText, ChevronRight,
  Plus, Trash2, Eye, EyeOff, Copy, ExternalLink, Info, AlertCircle,
  CheckCircle2, X, Database, Check, Zap, Wallet, ChevronDown, KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";

// ─── Sidebar Tabs ─────────────────────────────────────────────────────────────
const SETTINGS_TABS = [
  { id: "general",       label: "General",       icon: Settings },
  { id: "plan",          label: "Plan",          icon: Zap },
  { id: "billing",       label: "Billing",       icon: Wallet },
  { id: "users",         label: "Users & Permissions", icon: Users },
  { id: "payments",      label: "Payments",      icon: CreditCard },
  { id: "checkout",      label: "Checkout",      icon: ShoppingCart },
  { id: "accounts",      label: "Customer accounts", icon: Users },
  { id: "shipping",      label: "Shipping",      icon: Truck },
  { id: "taxes",         label: "Taxes",         icon: Receipt },
  { id: "locations",     label: "Locations",     icon: MapPin },
  { id: "channels",      label: "Sales channels", icon: Globe },
  { id: "domains",       label: "Domains",       icon: Globe },
  { id: "events",        label: "Customer events", icon: Calendar },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "metafields",    label: "Metafields",    icon: Code },
  { id: "languages",     label: "Languages",     icon: Languages },
  { id: "privacy",       label: "Privacy",       icon: Shield },
  { id: "policies",      label: "Policies",      icon: FileText },
  { id: "integrations",  label: "Integrations",  icon: Globe },
];

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh",
];

// ─── Shared hook ──────────────────────────────────────────────────────────────
function useSettings() {
  const { data: allSettings, isLoading, refetch } = trpc.settings.getAll.useQuery();
  const bulkSet = trpc.settings.bulkSet.useMutation({
    onSuccess: () => { refetch(); },
  });

  // Parse every stored value ONCE per allSettings snapshot. This gives get()
  // a STABLE reference for each key (it only changes when allSettings changes,
  // i.e. initial load or post-save refetch) — so `const loaded = get(key);
  // useEffect(..., [loaded])` runs only when the data really changes instead of
  // every render. Without this, re-parsing produced a new object each render,
  // re-running init effects and overwriting in-progress edits (tabs became
  // read-only after their first save).
  const parsed = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: Record<string, any> = {};
    if (allSettings) {
      for (const [k, v] of Object.entries(allSettings as Record<string, unknown>)) {
        if (typeof v === 'string') {
          try { out[k] = JSON.parse(v); } catch { out[k] = v; }
        } else {
          out[k] = v;
        }
      }
    }
    return out;
  }, [allSettings]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const get = useCallback((key: string, fallback: any = null): any => {
    if (!(key in parsed)) return fallback;
    return parsed[key] ?? fallback;
  }, [parsed]);

  const save = useCallback(async (key: string, value: unknown) => {
    await bulkSet.mutateAsync({ settings: { [key]: JSON.stringify(value) } });
  }, [bulkSet]);

  const saveMany = useCallback(async (map: Record<string, unknown>) => {
    const serialized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(map)) serialized[k] = JSON.stringify(v);
    await bulkSet.mutateAsync({ settings: serialized });
  }, [bulkSet]);

  return { get, save, saveMany, isLoading, saving: bulkSet.isPending, allSettings };
}

// ─── Reusable UI helpers ──────────────────────────────────────────────────────
function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
      <div className="mb-4">
        <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-[12px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function FormRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-800">{label}</p>
        {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="w-64 flex-shrink-0">{children}</div>
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", disabled = false }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047] disabled:bg-gray-50 disabled:text-gray-400"
    />
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#43A047]"></div>
    </label>
  );
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="px-5 py-2 bg-[#43A047] text-white text-[13px] font-semibold rounded-lg hover:bg-[#388E3C] transition-colors flex items-center gap-2 disabled:opacity-60"
    >
      {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
      Save changes
    </button>
  );
}

// Logo/stamp uploader — reads a file, base64-uploads via blog.uploadImage
// (Vercel Blob) and returns the public URL. Used for invoice + footer branding.
function LogoUpload({ label, hint, value, onChange, round = false }: {
  label: string; hint?: string; value: string; onChange: (url: string) => void; round?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const upload = trpc.blog.admin.uploadImage.useMutation();
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error("Image too large (max 3MB)"); return; }
    setBusy(true);
    try {
      const base64: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1] || "");
        r.onerror = () => rej(new Error("read failed"));
        r.readAsDataURL(file);
      });
      const { url } = await upload.mutateAsync({ base64, filename: file.name, mimeType: file.type || "image/png" });
      onChange(url);
      toast.success(`${label} uploaded`);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-start justify-between gap-6 py-2 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-800">{label}</p>
        {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="w-64 flex-shrink-0 flex items-center gap-3">
        <div className={`w-14 h-14 flex-shrink-0 border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden ${round ? "rounded-full" : "rounded-lg"}`}>
          {value
            ? <img src={value} alt={label} className="w-full h-full object-contain" />
            : <span className="text-[10px] text-gray-300">None</span>}
        </div>
        <div className="flex-1">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#43A047] border border-[#43A047]/40 rounded-lg cursor-pointer hover:bg-[#43A047]/5">
            {busy ? "Uploading…" : value ? "Replace" : "Upload"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              disabled={busy} onChange={e => onFile(e.target.files?.[0])} />
          </label>
          {value && (
            <button type="button" onClick={() => onChange("")}
              className="ml-2 text-[12px] text-gray-400 hover:text-red-500">Remove</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab Components ───────────────────────────────────────────────────────────

function GeneralTab() {
  const { get, saveMany, saving } = useSettings();
  const defaults = {
    storeName: "Nutriwow", storeEmail: "wecare@nutriwow.in", storePhone: "+91 95463 34633",
    storeCurrency: "INR", storeTimezone: "Asia/Kolkata", storeAddress: "123, Business Park",
    storeCity: "Mumbai", storeState: "Maharashtra", storePincode: "400001",
    storeGST: "", storeLogo: "", storeFavicon: "", gscVerification: ""
  };
  const [store, setStore] = useState(defaults);
  const loaded = get("general", null);
  useEffect(() => { if (loaded) setStore({ ...defaults, ...loaded }); }, [loaded]);

  // Mobile app display flags (read by the Flutter app via settings.getPublic)
  const appDefaults = { vegMark: false };
  const [appCfg, setAppCfg] = useState(appDefaults);
  const loadedApp = get("appConfig", null);
  useEffect(() => { if (loadedApp) setAppCfg({ ...appDefaults, ...loadedApp }); }, [loadedApp]);

  // Brand logos & stamps for invoices + storefront footer
  const brandDefaults = { nutriwowLogo: "", foodondoorLogo: "", foodondoorStamp: "", kuddleLogo: "", mrHealthybiteLogo: "", nutridayLogo: "", signature: "" };
  const [brand, setBrand] = useState(brandDefaults);
  const loadedBrand = get("brandAssets", null);
  useEffect(() => { if (loadedBrand) setBrand({ ...brandDefaults, ...loadedBrand }); }, [loadedBrand]);

  const save = async () => {
    await saveMany({ general: store, appConfig: appCfg, brandAssets: brand });
    toast.success("General settings saved!");
  };

  return (
    <div>
      <SectionCard title="Store details" subtitle="Basic information about your store">
        <FormRow label="Store name" hint="Appears on receipts and emails">
          <Input value={store.storeName} onChange={v => setStore(s => ({ ...s, storeName: v }))} placeholder="Nutriwow" />
        </FormRow>
        <FormRow label="Store email" hint="Used for order confirmations">
          <Input value={store.storeEmail} onChange={v => setStore(s => ({ ...s, storeEmail: v }))} placeholder="wecare@nutriwow.in" type="email" />
        </FormRow>
        <FormRow label="Phone number">
          <Input value={store.storePhone} onChange={v => setStore(s => ({ ...s, storePhone: v }))} placeholder="+91 95463 34633" />
        </FormRow>
        <FormRow label="GST Number" hint="GSTIN for tax invoices">
          <Input value={store.storeGST} onChange={v => setStore(s => ({ ...s, storeGST: v }))} placeholder="27AABCU9603R1ZX" />
        </FormRow>
      </SectionCard>
      <SectionCard title="Store address" subtitle="Used on invoices and for shipping calculations">
        <FormRow label="Address">
          <Input value={store.storeAddress} onChange={v => setStore(s => ({ ...s, storeAddress: v }))} placeholder="Street address" />
        </FormRow>
        <FormRow label="City">
          <Input value={store.storeCity} onChange={v => setStore(s => ({ ...s, storeCity: v }))} placeholder="Mumbai" />
        </FormRow>
        <FormRow label="State">
          <select value={store.storeState} onChange={e => setStore(s => ({ ...s, storeState: e.target.value }))}
            className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]">
            {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
          </select>
        </FormRow>
        <FormRow label="Pincode">
          <Input value={store.storePincode} onChange={v => setStore(s => ({ ...s, storePincode: v }))} placeholder="400001" />
        </FormRow>
      </SectionCard>
      <SectionCard title="Standards and formats">
        <FormRow label="Currency" hint="All prices shown in this currency">
          <select value={store.storeCurrency} onChange={e => setStore(s => ({ ...s, storeCurrency: e.target.value }))}
            className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]">
            <option value="INR">INR – Indian Rupee (₹)</option>
            <option value="USD">USD – US Dollar ($)</option>
          </select>
        </FormRow>
        <FormRow label="Timezone">
          <select value={store.storeTimezone} onChange={e => setStore(s => ({ ...s, storeTimezone: e.target.value }))}
            className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]">
            <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
            <option value="UTC">UTC</option>
          </select>
        </FormRow>
      </SectionCard>
      <SectionCard title="Brand & invoice logos" subtitle="Logos and seal used on the GST invoice PDF and storefront footer. PNG with transparent background works best.">
        <LogoUpload label="Nutriwow logo" hint="Brand under Foodondoor — footer & invoice"
          value={brand.nutriwowLogo} onChange={v => setBrand(s => ({ ...s, nutriwowLogo: v }))} />
        <LogoUpload label="Foodondoor logo" hint="Shown on the invoice header (legal entity)"
          value={brand.foodondoorLogo} onChange={v => setBrand(s => ({ ...s, foodondoorLogo: v }))} />
        <LogoUpload label="Foodondoor round stamp / seal" hint="Round company seal, shown bottom-right of the invoice by the signatory" round
          value={brand.foodondoorStamp} onChange={v => setBrand(s => ({ ...s, foodondoorStamp: v }))} />
        <LogoUpload label="Authorised signature" hint="Digital signature, shown next to the stamp above 'Authorised Signatory' (transparent PNG best)"
          value={brand.signature} onChange={v => setBrand(s => ({ ...s, signature: v }))} />
        <LogoUpload label="Kuddle Super Meal logo" hint="Brand under Foodondoor — footer & invoice"
          value={brand.kuddleLogo} onChange={v => setBrand(s => ({ ...s, kuddleLogo: v }))} />
        <LogoUpload label="Mr Healthybite logo" hint="Brand under Foodondoor — footer & invoice"
          value={brand.mrHealthybiteLogo} onChange={v => setBrand(s => ({ ...s, mrHealthybiteLogo: v }))} />
        <LogoUpload label="Nutriday logo" hint="Brand under Foodondoor — footer & invoice"
          value={brand.nutridayLogo} onChange={v => setBrand(s => ({ ...s, nutridayLogo: v }))} />
      </SectionCard>
      <SectionCard title="Mobile app" subtitle="Display options for the Nutriwow Android/iOS app">
        <FormRow label="Show veg mark on products" hint="Green veg indicator on product cards in the app (off = clean image)">
          <Toggle checked={appCfg.vegMark} onChange={v => setAppCfg(s => ({ ...s, vegMark: v }))} />
        </FormRow>
      </SectionCard>
      <div className="flex justify-end"><SaveButton onClick={save} saving={saving} /></div>
    </div>
  );
}

// Lets the owner set/change the admin login password. Requires the current
// password (server-enforced) so a hijacked session alone can't lock them out.
function ChangeAdminPasswordCard() {
  const utils = trpc.useUtils();
  const { data: status } = trpc.admin.passwordStatus.useQuery();
  const hasCustom = status?.customPasswordSet === true;
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const change = trpc.admin.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Admin password updated. Use it next time you log in.");
      setCur(""); setNext(""); setConfirm("");
      utils.admin.passwordStatus.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const submit = () => {
    if (!cur) { toast.error("Enter your current password"); return; }
    if (next.length < 6) { toast.error("New password must be at least 6 characters"); return; }
    if (next !== confirm) { toast.error("New passwords don't match"); return; }
    change.mutate({ currentPassword: cur, newPassword: next });
  };

  const inputCls = "w-full px-3 py-2 pr-10 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]";

  return (
    <SectionCard
      title="Admin password"
      subtitle={hasCustom ? "Change the password used to log in to this admin panel" : "Set your own admin password (replaces the default login password)"}
    >
      <div className="flex items-start gap-2 p-3 mb-2 bg-amber-50 border border-amber-200 rounded-lg">
        <KeyRound size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-700">
          {hasCustom
            ? "A custom password is set. The old default password no longer works."
            : "You're using the default admin password. Set a personal one below to secure your store."}
          {" "}Choose something only you know.
        </p>
      </div>
      <div className="space-y-3 max-w-md">
        {[
          { label: "Current password", val: cur, set: setCur, ph: "Your existing admin password" },
          { label: "New password", val: next, set: setNext, ph: "At least 6 characters" },
          { label: "Confirm new password", val: confirm, set: setConfirm, ph: "Re-enter new password" },
        ].map((f, i) => (
          <div key={f.label}>
            <label className="text-[12px] font-medium text-gray-600 mb-1 block">{f.label}</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={f.val}
                onChange={e => f.set(e.target.value)}
                placeholder={f.ph}
                autoComplete={i === 0 ? "current-password" : "new-password"}
                onKeyDown={e => e.key === "Enter" && submit()}
                className={inputCls}
              />
              {i === 0 && (
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          onClick={submit}
          disabled={change.isPending}
          className="px-5 py-2 bg-[#43A047] text-white text-[13px] font-semibold rounded-lg hover:bg-[#388E3C] transition-colors flex items-center gap-2 disabled:opacity-60"
        >
          {change.isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <KeyRound size={14} />}
          {hasCustom ? "Update password" : "Set password"}
        </button>
      </div>
    </SectionCard>
  );
}

const STAFF_ROLES = ["owner", "admin", "manager"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

const ROLE_BADGE: Record<StaffRole, string> = {
  owner: "bg-green-100 text-green-700",
  admin: "bg-blue-100 text-blue-700",
  manager: "bg-gray-100 text-gray-600",
};

function UsersTab() {
  const { get } = useSettings();
  const general = get("general", {}) as { storeName?: string; storeEmail?: string };
  const ownerName = general?.storeName || "Nutriwow Admin";
  const ownerEmail = general?.storeEmail || "wecare@nutriwow.in";

  const utils = trpc.useUtils();
  const { data: members = [], isLoading } = trpc.adminUsers.getAll.useQuery();

  const createUser = trpc.adminUsers.create.useMutation({
    onSuccess: () => {
      utils.adminUsers.getAll.invalidate();
      setShowAdd(false);
      setForm({ email: "", name: "", mobile: "", password: "", role: "admin" });
      toast.success("Staff member added!");
    },
    onError: (e) => toast.error(e.message),
  });
  const setRole = trpc.adminUsers.setRole.useMutation({
    onSuccess: () => { utils.adminUsers.getAll.invalidate(); toast.success("Role updated"); },
  });
  const setPassword = trpc.adminUsers.setPassword.useMutation({
    onSuccess: () => { setResetFor(null); setResetPass(""); toast.success("Password updated"); },
    onError: (e) => toast.error(e.message),
  });
  const removeUser = trpc.adminUsers.remove.useMutation({
    onSuccess: () => { utils.adminUsers.getAll.invalidate(); toast.success("Staff removed"); },
  });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", mobile: "", password: "", role: "admin" as StaffRole });
  const [resetFor, setResetFor] = useState<{ id: number; email: string } | null>(null);
  const [resetPass, setResetPass] = useState("");

  const selectCls = "px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]";

  return (
    <div>
      <SectionCard title="Store owner" subtitle="The owner has full access to all features and settings">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#43A047] flex items-center justify-center text-white font-bold text-lg">
            {ownerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-gray-900">{ownerName}</p>
            <p className="text-[12px] text-gray-500">{ownerEmail}</p>
          </div>
          <span className="ml-auto px-2.5 py-1 bg-green-100 text-green-700 text-[11px] font-semibold rounded-full">Owner</span>
        </div>
      </SectionCard>
      <ChangeAdminPasswordCard />
      <SectionCard title="Staff accounts" subtitle="Admin users who can log in with their own email + password">
        {isLoading ? (
          <p className="text-[13px] text-gray-400 mb-3">Loading...</p>
        ) : members.length === 0 ? (
          <p className="text-[13px] text-gray-500 mb-3">No staff added yet.</p>
        ) : (
          <div className="space-y-2 mb-3">
            {members.map((m: any) => (
              <div key={m.id} className="border border-gray-200 rounded-lg p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#43A047]/10 flex items-center justify-center text-[#43A047] font-bold text-[13px] flex-shrink-0">
                    {(m.name || m.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">{m.name || "—"}</p>
                    <p className="text-[11px] text-gray-500 truncate">{m.email}</p>
                  </div>
                  <select
                    className={`${selectCls} ${ROLE_BADGE[(m.role as StaffRole)] || ""}`}
                    value={m.role}
                    onChange={e => setRole.mutate({ id: m.id, role: e.target.value as StaffRole })}
                    disabled={setRole.isPending}
                  >
                    {STAFF_ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                  <button onClick={() => { setResetFor({ id: m.id, email: m.email }); setResetPass(""); }}
                    className="p-1.5 text-gray-300 hover:text-[#43A047]" title="Reset password">
                    <KeyRound size={15} />
                  </button>
                  <button onClick={() => { if (confirm(`Remove admin access for ${m.email}?`)) removeUser.mutate({ id: m.id }); }}
                    className="p-1.5 text-gray-300 hover:text-red-500" title="Remove">
                    <Trash2 size={15} />
                  </button>
                </div>
                {resetFor?.id === m.id && (
                  <div className="flex items-end gap-2 mt-3 pt-3 border-t border-gray-100">
                    <div className="flex-1">
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">New password</label>
                      <Input value={resetPass} onChange={setResetPass} placeholder="At least 6 characters" />
                    </div>
                    <button onClick={() => { if (resetPass.length >= 6) setPassword.mutate({ id: m.id, newPassword: resetPass }); }}
                      disabled={setPassword.isPending || resetPass.length < 6}
                      className="px-4 py-2 bg-[#43A047] text-white text-[13px] font-semibold rounded-lg hover:bg-[#388E3C] disabled:opacity-60">
                      Update
                    </button>
                    <button onClick={() => { setResetFor(null); setResetPass(""); }} className="p-2 text-gray-400 hover:text-gray-600"><X size={16} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showAdd ? (
          <div className="border border-gray-200 rounded-lg p-4 mb-3 bg-gray-50/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Email</label>
                <Input value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="name@example.com" type="email" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Full name</label>
                <Input value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Full name" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Mobile (optional)</label>
                <Input value={form.mobile} onChange={v => setForm({ ...form, mobile: v })} placeholder="10-digit" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Password</label>
                <Input value={form.password} onChange={v => setForm({ ...form, password: v })} placeholder="At least 6 characters" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Role</label>
                <select className={`${selectCls} w-full`} value={form.role} onChange={e => setForm({ ...form, role: e.target.value as StaffRole })}>
                  {STAFF_ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => {
                  if (!form.email.trim() || form.password.length < 6) { toast.error("Email aur 6+ char password zaroori hai"); return; }
                  createUser.mutate({
                    email: form.email.trim(),
                    name: form.name.trim() || undefined,
                    mobile: form.mobile.trim() || undefined,
                    password: form.password,
                    role: form.role,
                  });
                }}
                disabled={createUser.isPending}
                className="px-4 py-2 bg-[#43A047] text-white text-[13px] font-semibold rounded-lg hover:bg-[#388E3C] disabled:opacity-60">
                {createUser.isPending ? "Adding..." : "Add staff"}
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-[13px] text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-[13px] text-[#43A047] font-medium hover:underline">
            <Plus size={14} /> Add staff member
          </button>
        )}

        <p className="text-[11px] text-gray-400 mt-3">Staff log in at /admin/login with their own email + password. Owner has full access; roles are tracked per user.</p>
      </SectionCard>
    </div>
  );
}

function PaymentsTab() {
  const { get, saveMany, saving, allSettings } = useSettings();
  const defaults = {
    // PhonePe
    phonePeEnabled: true,
    // Razorpay
    rzEnabled: false,
    mode: "live" as "test" | "live",
    testKeyId: "", testKeySecret: "", liveKeyId: "", liveKeySecret: "",
    webhookSecret: "",
    // COD & UPI
    codEnabled: true, upiEnabled: false, upiId: "nutriwow@upi",
  };
  const [pay, setPay] = useState(defaults);
  const [initialized, setInitialized] = useState(false);
  const [showSecrets, setShowSecrets] = useState({ test: false, live: false, webhook: false });

  // Use allSettings (stable reference from tRPC cache) as dependency — NOT get() result
  // which creates a new object every render and causes infinite re-initialization loops
  useEffect(() => {
    if (!allSettings) return;
    const loaded = get("payments", null) as Record<string, unknown> | null;
    if (!loaded) return;
    // Migrate old schema: old DB had `enabled` (Razorpay) + no phonePeEnabled field
    const migrated: typeof defaults = {
      ...defaults,
      phonePeEnabled: loaded.phonePeEnabled !== undefined ? Boolean(loaded.phonePeEnabled) : true,
      rzEnabled: loaded.rzEnabled !== undefined ? Boolean(loaded.rzEnabled) : Boolean(loaded.enabled),
      mode: (loaded.mode as "test" | "live") || "live",
      testKeyId: (loaded.testKeyId as string) || "",
      testKeySecret: (loaded.testKeySecret as string) || "",
      liveKeyId: (loaded.liveKeyId as string) || "",
      liveKeySecret: (loaded.liveKeySecret as string) || "",
      webhookSecret: (loaded.webhookSecret as string) || "",
      codEnabled: loaded.codEnabled !== undefined ? Boolean(loaded.codEnabled) : true,
      upiEnabled: loaded.upiEnabled !== undefined ? Boolean(loaded.upiEnabled) : false,
      upiId: (loaded.upiId as string) || "nutriwow@upi",
    };
    // Only initialize once from DB; after that, local state is source of truth until next page load
    if (!initialized) {
      setPay(migrated);
      setInitialized(true);
    }
  }, [allSettings]);

  const save = async () => {
    await saveMany({ payments: pay });
    toast.success("Payment settings saved!");
  };

  const rzConnected = pay.rzEnabled && (pay.mode === "test" ? (pay.testKeyId && pay.testKeySecret) : (pay.liveKeyId && pay.liveKeySecret));

  return (
    <div className="space-y-5">
      {/* ── PhonePe ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#5f259f] flex items-center justify-center">
              <span className="text-white font-bold text-[11px]">PhPe</span>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900">PhonePe</h3>
              <p className="text-[12px] text-gray-500">UPI · Cards · Netbanking · Wallets</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pay.phonePeEnabled ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-[12px] font-semibold rounded-full">
                <CheckCircle2 size={13} /> Active
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 text-[12px] font-semibold rounded-full">
                <AlertCircle size={13} /> Disabled
              </span>
            )}
            <Toggle checked={pay.phonePeEnabled} onChange={v => setPay(s => ({ ...s, phonePeEnabled: v }))} />
          </div>
        </div>
        {pay.phonePeEnabled && (
          <div className="px-6 pb-5 border-t border-gray-50 pt-4">
            <p className="text-[12px] text-gray-500">PhonePe credentials are configured via environment secrets (PHONEPE_CLIENT_ID, PHONEPE_CLIENT_SECRET). Contact your developer to update them.</p>
            <div className="mt-3 space-y-2">
              <div>
                <label className="text-[12px] font-medium text-gray-600 mb-1 block">Webhook URL (add in PhonePe dashboard)</label>
                <div className="flex gap-2">
                  <input readOnly value="https://nutriwow.in/api/phonepe/webhook"
                    className="flex-1 px-3 py-2 text-[13px] bg-gray-50 border border-gray-300 rounded-lg text-gray-500" />
                  <button onClick={() => { navigator.clipboard.writeText("https://nutriwow.in/api/phonepe/webhook"); toast.success("Copied!"); }}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500">
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Razorpay ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#072654] flex items-center justify-center">
              <span className="text-white font-bold text-[13px]">Rz</span>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900">Razorpay</h3>
              <p className="text-[12px] text-gray-500">UPI · Cards · Netbanking · Wallets</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {rzConnected ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-[12px] font-semibold rounded-full">
                <CheckCircle2 size={13} /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 text-[12px] font-semibold rounded-full">
                <AlertCircle size={13} /> {pay.rzEnabled ? "Keys missing" : "Disabled"}
              </span>
            )}
            <Toggle checked={pay.rzEnabled} onChange={v => setPay(s => ({ ...s, rzEnabled: v }))} />
          </div>
        </div>
        {pay.rzEnabled && (
          <div className="px-6 pb-5 border-t border-gray-50 pt-4">
            <div className="mb-5">
              <p className="text-[13px] font-medium text-gray-700 mb-2">Mode</p>
              <div className="flex gap-2">
                {(["test", "live"] as const).map(m => (
                  <button key={m} onClick={() => setPay(s => ({ ...s, mode: m }))}
                    className={`px-4 py-2 rounded-lg text-[13px] font-semibold border transition-all ${
                      pay.mode === m ? "bg-[#43A047] text-white border-[#43A047]" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                    }`}>
                    {m === "test" ? "🧪 Test mode" : "🚀 Live mode"}
                  </button>
                ))}
              </div>
            </div>
            {pay.mode === "test" && (
              <div className="space-y-3 mb-5">
                <p className="text-[13px] font-semibold text-gray-700 border-b border-gray-100 pb-2">Test API Keys</p>
                <div>
                  <label className="text-[12px] font-medium text-gray-600 mb-1 block">Test Key ID</label>
                  <Input value={pay.testKeyId} onChange={v => setPay(s => ({ ...s, testKeyId: v }))} placeholder="rzp_test_xxxxxxxxxxxx" />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-gray-600 mb-1 block">Test Key Secret</label>
                  <div className="relative">
                    <input type={showSecrets.test ? "text" : "password"} value={pay.testKeySecret}
                      onChange={e => setPay(s => ({ ...s, testKeySecret: e.target.value }))}
                      placeholder="Enter test key secret"
                      className="w-full px-3 py-2 pr-10 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]" />
                    <button onClick={() => setShowSecrets(s => ({ ...s, test: !s.test }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showSecrets.test ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {pay.mode === "live" && (
              <div className="space-y-3 mb-5">
                <p className="text-[13px] font-semibold text-gray-700 border-b border-gray-100 pb-2">Live API Keys</p>
                <div>
                  <label className="text-[12px] font-medium text-gray-600 mb-1 block">Live Key ID</label>
                  <Input value={pay.liveKeyId} onChange={v => setPay(s => ({ ...s, liveKeyId: v }))} placeholder="rzp_live_xxxxxxxxxxxx" />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-gray-600 mb-1 block">Live Key Secret</label>
                  <div className="relative">
                    <input type={showSecrets.live ? "text" : "password"} value={pay.liveKeySecret}
                      onChange={e => setPay(s => ({ ...s, liveKeySecret: e.target.value }))}
                      placeholder="Enter live key secret"
                      className="w-full px-3 py-2 pr-10 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]" />
                    <button onClick={() => setShowSecrets(s => ({ ...s, live: !s.live }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showSecrets.live ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-3 mb-5">
              <p className="text-[13px] font-semibold text-gray-700 border-b border-gray-100 pb-2">Webhook</p>
              <div>
                <label className="text-[12px] font-medium text-gray-600 mb-1 block">Webhook URL (add in Razorpay dashboard)</label>
                <div className="flex gap-2">
                  <input readOnly value="https://nutriwow.in/api/razorpay/webhook"
                    className="flex-1 px-3 py-2 text-[13px] bg-gray-50 border border-gray-300 rounded-lg text-gray-500" />
                  <button onClick={() => { navigator.clipboard.writeText("https://nutriwow.in/api/razorpay/webhook"); toast.success("Copied!"); }}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500">
                    <Copy size={14} />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[12px] font-medium text-gray-600 mb-1 block">Webhook Secret</label>
                <div className="relative">
                  <input type={showSecrets.webhook ? "text" : "password"} value={pay.webhookSecret}
                    onChange={e => setPay(s => ({ ...s, webhookSecret: e.target.value }))}
                    placeholder="Enter webhook secret"
                    className="w-full px-3 py-2 pr-10 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]" />
                  <button onClick={() => setShowSecrets(s => ({ ...s, webhook: !s.webhook }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showSecrets.webhook ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>
            <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] text-[#43A047] hover:underline mb-4">
              <ExternalLink size={12} /> Get your API keys from Razorpay Dashboard
            </a>
          </div>
        )}
      </div>

      {/* ── COD ── */}
      <SectionCard title="Cash on Delivery (COD)" subtitle="Allow customers to pay when order is delivered">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-gray-800">Enable COD</p>
            <p className="text-[11px] text-gray-400">Customers can pay cash at delivery</p>
          </div>
          <Toggle checked={pay.codEnabled} onChange={v => setPay(s => ({ ...s, codEnabled: v }))} />
        </div>
      </SectionCard>

      {/* ── Manual UPI ── */}
      <SectionCard title="Manual UPI" subtitle="Display your UPI ID for direct bank transfers">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[13px] font-medium text-gray-800">Enable Manual UPI</p>
            <p className="text-[11px] text-gray-400">Show UPI ID on checkout for direct payment</p>
          </div>
          <Toggle checked={pay.upiEnabled} onChange={v => setPay(s => ({ ...s, upiEnabled: v }))} />
        </div>
        {pay.upiEnabled && <Input value={pay.upiId} onChange={v => setPay(s => ({ ...s, upiId: v }))} placeholder="yourstore@upi" />}
      </SectionCard>

      <div className="flex justify-end"><SaveButton onClick={save} saving={saving} /></div>
    </div>
  );
}

function CheckoutTab() {
  const { get, saveMany, saving } = useSettings();
  const defaults = {
    guestCheckout: true, addressAutofill: true, orderNotes: true,
    tipping: false, termsRequired: true, minOrderValue: "0",
    abandonedCartEmail: true, confirmationEmail: true,
    prepaidDiscountPercent: "0", deliveryDaysMin: "3", deliveryDaysMax: "7",
  };
  const [settings, setSettings] = useState(defaults);
  const loaded = get("checkout", null);
  useEffect(() => { if (loaded) setSettings({ ...defaults, ...loaded }); }, [loaded]);

  // "Also available on" marketplace links (#25) — shown in the storefront footer.
  const [marketplaces, setMarketplaces] = useState<{ name: string; url: string }[]>([]);
  const loadedMkt = get("marketplaces", null);
  useEffect(() => { if (Array.isArray(loadedMkt)) setMarketplaces(loadedMkt as { name: string; url: string }[]); }, [loadedMkt]);

  const save = async () => {
    const cleanMkt = marketplaces.filter(m => m.name.trim() && m.url.trim());
    await saveMany({ checkout: settings, marketplaces: cleanMkt });
    toast.success("Checkout settings saved!");
  };

  return (
    <div>
      <SectionCard title="Customer contact" subtitle="How customers identify themselves at checkout">
        <FormRow label="Guest checkout" hint="Allow checkout without account">
          <Toggle checked={settings.guestCheckout} onChange={v => setSettings(s => ({ ...s, guestCheckout: v }))} />
        </FormRow>
        <FormRow label="Address autofill" hint="Use Google Maps to autofill addresses">
          <Toggle checked={settings.addressAutofill} onChange={v => setSettings(s => ({ ...s, addressAutofill: v }))} />
        </FormRow>
        <FormRow label="Order notes" hint="Let customers add a note to their order">
          <Toggle checked={settings.orderNotes} onChange={v => setSettings(s => ({ ...s, orderNotes: v }))} />
        </FormRow>
        <FormRow label="Tipping" hint="Allow customers to add a tip at checkout">
          <Toggle checked={settings.tipping} onChange={v => setSettings(s => ({ ...s, tipping: v }))} />
        </FormRow>
        <FormRow label="Require terms acceptance" hint="Customers must accept T&C before placing order">
          <Toggle checked={settings.termsRequired} onChange={v => setSettings(s => ({ ...s, termsRequired: v }))} />
        </FormRow>
        <FormRow label="Minimum order value (₹)" hint="Set 0 to disable minimum order">
          <Input value={settings.minOrderValue} onChange={v => setSettings(s => ({ ...s, minOrderValue: v }))} placeholder="0" type="number" />
        </FormRow>
      </SectionCard>
      <SectionCard title="Offers & delivery" subtitle="Incentives and delivery estimate shown at checkout / product page">
        <FormRow label="Online payment discount (%)" hint="Discount for prepaid (online) orders vs COD. 0 = off. Shown on cart + reduces the charged total.">
          <Input value={settings.prepaidDiscountPercent} onChange={v => setSettings(s => ({ ...s, prepaidDiscountPercent: v }))} placeholder="0" type="number" />
        </FormRow>
        <FormRow label="Delivery estimate — min days" hint="Fastest delivery estimate (used when courier gives none)">
          <Input value={settings.deliveryDaysMin} onChange={v => setSettings(s => ({ ...s, deliveryDaysMin: v }))} placeholder="3" type="number" />
        </FormRow>
        <FormRow label="Delivery estimate — max days" hint="Slowest delivery estimate — shows 'Delivery by <date range>' on the product page">
          <Input value={settings.deliveryDaysMax} onChange={v => setSettings(s => ({ ...s, deliveryDaysMax: v }))} placeholder="7" type="number" />
        </FormRow>
      </SectionCard>
      <SectionCard title="Also available on" subtitle="Marketplace links shown in the storefront footer. Leave empty to hide.">
        {marketplaces.map((m, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <Input value={m.name} onChange={v => setMarketplaces(list => list.map((x, j) => j === i ? { ...x, name: v } : x))} placeholder="Amazon" />
            <Input value={m.url} onChange={v => setMarketplaces(list => list.map((x, j) => j === i ? { ...x, url: v } : x))} placeholder="https://amazon.in/..." />
            <button type="button" onClick={() => setMarketplaces(list => list.filter((_, j) => j !== i))} className="text-red-500 text-sm px-2 py-1 hover:bg-red-50 rounded">Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => setMarketplaces(list => [...list, { name: "", url: "" }])} className="text-[#43A047] text-sm font-semibold mt-1">+ Add marketplace</button>
      </SectionCard>
      <SectionCard title="Email notifications">
        <FormRow label="Order confirmation email" hint="Send email when order is placed">
          <Toggle checked={settings.confirmationEmail} onChange={v => setSettings(s => ({ ...s, confirmationEmail: v }))} />
        </FormRow>
        <FormRow label="Abandoned cart recovery" hint="Send reminder email for incomplete checkouts">
          <Toggle checked={settings.abandonedCartEmail} onChange={v => setSettings(s => ({ ...s, abandonedCartEmail: v }))} />
        </FormRow>
      </SectionCard>
      <div className="flex justify-end"><SaveButton onClick={save} saving={saving} /></div>
    </div>
  );
}

function AccountsTab() {
  const { get, saveMany, saving } = useSettings();
  const defaults = { loginRequired: false, socialLogin: false, wishlist: true, orderHistory: true, addressBook: true };
  const [settings, setSettings] = useState(defaults);
  const loaded = get("accounts", null);
  useEffect(() => { if (loaded) setSettings({ ...defaults, ...loaded }); }, [loaded]);

  const save = async () => {
    await saveMany({ accounts: settings });
    toast.success("Account settings saved!");
  };

  return (
    <div>
      <SectionCard title="Customer accounts" subtitle="Control how customers sign in to your store">
        <FormRow label="Require login to checkout" hint="Customers must create an account to place orders">
          <Toggle checked={settings.loginRequired} onChange={v => setSettings(s => ({ ...s, loginRequired: v }))} />
        </FormRow>
        <FormRow label="Social login" hint="Allow Google / Facebook login">
          <Toggle checked={settings.socialLogin} onChange={v => setSettings(s => ({ ...s, socialLogin: v }))} />
        </FormRow>
        <FormRow label="Wishlist" hint="Let customers save products to a wishlist">
          <Toggle checked={settings.wishlist} onChange={v => setSettings(s => ({ ...s, wishlist: v }))} />
        </FormRow>
        <FormRow label="Order history" hint="Customers can view past orders">
          <Toggle checked={settings.orderHistory} onChange={v => setSettings(s => ({ ...s, orderHistory: v }))} />
        </FormRow>
        <FormRow label="Address book" hint="Customers can save multiple delivery addresses">
          <Toggle checked={settings.addressBook} onChange={v => setSettings(s => ({ ...s, addressBook: v }))} />
        </FormRow>
      </SectionCard>
      <div className="flex justify-end"><SaveButton onClick={save} saving={saving} /></div>
    </div>
  );
}

type ShippingZone = { id: string; name: string; states: string; rate: string; freeAbove: string };

function ShippingTab() {
  const { get, saveMany, saving } = useSettings();
  const defaultZones: ShippingZone[] = [
    { id: "1", name: "All India", states: "All states", rate: "49", freeAbove: "499" },
    { id: "2", name: "Metro Cities", states: "Delhi, Mumbai, Bangalore, Chennai, Hyderabad, Kolkata", rate: "29", freeAbove: "299" },
  ];
  const [zones, setZones] = useState<ShippingZone[]>(defaultZones);
  const [processing, setProcessing] = useState("1-2");
  const [activeChannel, setActiveChannel] = useState<"none" | "shiprocket" | "ithink">("none");
  const [srConnected, setSrConnected] = useState(false);
  const [ithinkConnected, setIthinkConnected] = useState(false);
  const loaded = get("shipping", null);
  useEffect(() => {
    if (loaded) {
      if (loaded.zones) setZones(loaded.zones);
      if (loaded.processing) setProcessing(loaded.processing);
      if (loaded.activeChannel) setActiveChannel(loaded.activeChannel);
      if (loaded.srConnected !== undefined) setSrConnected(loaded.srConnected);
      if (loaded.ithinkConnected !== undefined) setIthinkConnected(loaded.ithinkConnected);
    }
  }, [loaded]);

  const save = async () => {
    await saveMany({ shipping: { zones, processing, activeChannel, srConnected, ithinkConnected } });
    toast.success("Shipping settings saved!");
  };

  return (
    <div>
      <SectionCard title="Shipping Channels" subtitle="Connect logistics partners to create shipments directly from orders">
        {/* Shiprocket */}
        <div className={`border-2 rounded-xl p-4 mb-4 transition-colors ${activeChannel === "shiprocket" ? "border-[#43A047] bg-green-50/40" : "border-gray-200"}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                <Truck size={18} className="text-orange-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-gray-900">Shiprocket</p>
                  {srConnected && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full flex items-center gap-1"><CheckCircle2 size={10} /> Connected</span>}
                  {activeChannel === "shiprocket" && <span className="px-2 py-0.5 bg-[#43A047] text-white text-[10px] font-bold rounded-full">Default</span>}
                </div>
                <p className="text-[12px] text-gray-500 mt-0.5">India's largest shipping aggregator — 25+ courier partners</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {srConnected ? (
                <>
                  {activeChannel !== "shiprocket" && (
                    <button onClick={() => setActiveChannel("shiprocket")}
                      className="px-3 py-1.5 text-[12px] font-semibold text-[#43A047] border border-[#43A047] rounded-lg hover:bg-green-50 transition-colors">
                      Set as Default
                    </button>
                  )}
                  <button onClick={() => { setSrConnected(false); if (activeChannel === "shiprocket") setActiveChannel("none"); toast.success("Disconnected"); }}
                    className="px-3 py-1.5 text-[12px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                    Disconnect
                  </button>
                </>
              ) : (
                <button onClick={() => { setSrConnected(true); toast.success("Shiprocket marked as connected. Credentials are configured via environment variables."); }}
                  className="px-4 py-1.5 text-[12px] font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1.5">
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>
        {/* iThink */}
        <div className={`border-2 rounded-xl p-4 transition-colors ${activeChannel === "ithink" ? "border-[#43A047] bg-green-50/40" : "border-gray-200"}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                <Truck size={18} className="text-blue-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-gray-900">iThink Logistics</p>
                  {ithinkConnected && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full flex items-center gap-1"><CheckCircle2 size={10} /> Connected</span>}
                  {activeChannel === "ithink" && <span className="px-2 py-0.5 bg-[#43A047] text-white text-[10px] font-bold rounded-full">Default</span>}
                </div>
                <p className="text-[12px] text-gray-500 mt-0.5">Reliable logistics — Delhivery, FedEx, Xpressbees & more</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {ithinkConnected ? (
                <>
                  {activeChannel !== "ithink" && (
                    <button onClick={() => setActiveChannel("ithink")}
                      className="px-3 py-1.5 text-[12px] font-semibold text-[#43A047] border border-[#43A047] rounded-lg hover:bg-green-50 transition-colors">
                      Set as Default
                    </button>
                  )}
                  <button onClick={() => { setIthinkConnected(false); if (activeChannel === "ithink") setActiveChannel("none"); toast.success("Disconnected"); }}
                    className="px-3 py-1.5 text-[12px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                    Disconnect
                  </button>
                </>
              ) : (
                <button onClick={() => { setIthinkConnected(true); toast.success("iThink marked as connected. Credentials are configured via environment variables."); }}
                  className="px-4 py-1.5 text-[12px] font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5">
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Shipping zones" subtitle="Set delivery rates for different regions">
        <div className="space-y-3 mb-4">
          {zones.map(z => (
            <div key={z.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-semibold text-gray-800">{z.name}</p>
                <button onClick={() => setZones(prev => prev.filter(x => x.id !== z.id))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-[11px] text-gray-500 mb-1 block">States covered</label><Input value={z.states} onChange={v => setZones(prev => prev.map(x => x.id === z.id ? { ...x, states: v } : x))} /></div>
                <div><label className="text-[11px] text-gray-500 mb-1 block">Shipping rate (₹)</label><Input value={z.rate} onChange={v => setZones(prev => prev.map(x => x.id === z.id ? { ...x, rate: v } : x))} type="number" /></div>
                <div><label className="text-[11px] text-gray-500 mb-1 block">Free above (₹)</label><Input value={z.freeAbove} onChange={v => setZones(prev => prev.map(x => x.id === z.id ? { ...x, freeAbove: v } : x))} type="number" /></div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setZones(prev => [...prev, { id: Date.now().toString(), name: "New Zone", states: "", rate: "49", freeAbove: "499" }])}
          className="flex items-center gap-1.5 text-[13px] text-[#43A047] font-medium hover:underline">
          <Plus size={14} /> Add shipping zone
        </button>
      </SectionCard>

      <SectionCard title="Processing time" subtitle="How long before orders are dispatched">
        <FormRow label="Processing time">
          <select value={processing} onChange={e => setProcessing(e.target.value)}
            className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]">
            <option value="same-day">Same day</option>
            <option value="1">1 business day</option>
            <option value="1-2">1–2 business days</option>
            <option value="2-3">2–3 business days</option>
            <option value="3-5">3–5 business days</option>
          </select>
        </FormRow>
      </SectionCard>
      <div className="flex justify-end"><SaveButton onClick={save} saving={saving} /></div>
    </div>
  );
}

function TaxesTab() {
  const { get, saveMany, saving } = useSettings();
  const defaults = { gstEnabled: true, pricesIncludeTax: false };
  const [settings, setSettings] = useState(defaults);
  const loaded = get("taxes", null);
  useEffect(() => { if (loaded) setSettings({ ...defaults, ...loaded }); }, [loaded]);
  const general = get("general", null);
  const gstFromGeneral = general?.storeGST || "";

  const save = async () => {
    await saveMany({ taxes: settings });
    toast.success("Tax settings saved!");
  };

  return (
    <div>
      <SectionCard title="GST settings" subtitle="Goods and Services Tax configuration for India">
        <FormRow label="Enable GST" hint="Show GST on invoices and receipts">
          <Toggle checked={settings.gstEnabled} onChange={v => setSettings(s => ({ ...s, gstEnabled: v }))} />
        </FormRow>
        <FormRow label="GSTIN" hint="Edit in Settings → General → GST Number">
          <Input value={gstFromGeneral} disabled placeholder="Set in General settings" />
        </FormRow>
        <FormRow label="Prices include tax" hint="Product prices shown on store include GST">
          <Toggle checked={settings.pricesIncludeTax} onChange={v => setSettings(s => ({ ...s, pricesIncludeTax: v }))} />
        </FormRow>
      </SectionCard>
      <SectionCard title="Tax rates" subtitle="GST rates applied to products">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Category</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium">GST Rate</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-medium">HSN Code</th>
              </tr>
            </thead>
            <tbody>
              {[["Dry Fruits & Nuts", "5%", "0813"], ["Seeds", "5%", "1207"], ["Snacks", "12%", "2106"], ["Makhana", "5%", "0714"]].map(([cat, rate, hsn]) => (
                <tr key={cat} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-800">{cat}</td>
                  <td className="px-4 py-3 text-gray-600">{rate}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{hsn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <div className="flex justify-end"><SaveButton onClick={save} saving={saving} /></div>
    </div>
  );
}

type StoreLocation = { id: string; name: string; address: string; pincode: string; active: boolean };

function LocationsTab() {
  const { get, save, saving } = useSettings();
  const defaults: StoreLocation[] = [
    { id: "1", name: "Primary Warehouse", address: "Mumbai, Maharashtra", pincode: "400001", active: true },
  ];
  const [locations, setLocations] = useState<StoreLocation[]>(defaults);
  const loaded = get("locations", null);
  useEffect(() => { if (loaded && Array.isArray(loaded) && loaded.length) setLocations(loaded); }, [loaded]);

  const update = (id: string, patch: Partial<StoreLocation>) =>
    setLocations(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));
  const addLoc = () =>
    setLocations(prev => [...prev, { id: Date.now().toString(), name: "New location", address: "", pincode: "", active: true }]);
  const removeLoc = (id: string) => setLocations(prev => prev.filter(l => l.id !== id));
  const saveAll = async () => { await save("locations", locations); toast.success("Locations saved!"); };

  return (
    <div>
      <SectionCard title="Locations" subtitle="Manage your store locations and warehouses">
        <div className="space-y-3">
          {locations.map(loc => (
            <div key={loc.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Location</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[12px] text-gray-600">
                    <Toggle checked={loc.active} onChange={v => update(loc.id, { active: v })} />
                    {loc.active ? "Active" : "Inactive"}
                  </label>
                  {locations.length > 1 && (
                    <button onClick={() => removeLoc(loc.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={15} /></button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input value={loc.name} onChange={v => update(loc.id, { name: v })} placeholder="Location name" />
                <Input value={loc.pincode} onChange={v => update(loc.id, { pincode: v })} placeholder="Pincode" />
                <div className="sm:col-span-2">
                  <Input value={loc.address} onChange={v => update(loc.id, { address: v })} placeholder="Address (city, state)" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addLoc} className="flex items-center gap-1.5 text-[13px] text-[#43A047] font-medium hover:underline mt-3">
          <Plus size={14} /> Add location
        </button>
      </SectionCard>
      <div className="flex justify-end"><SaveButton onClick={saveAll} saving={saving} /></div>
    </div>
  );
}

function PlanTab() {
  const features = [
    "Unlimited products & orders",
    "Razorpay & COD payments",
    "WhatsApp OTP login & campaigns",
    "Blog, coupons & abandoned-cart recovery",
    "Shiprocket / iThink shipping integration",
  ];
  return (
    <div>
      <SectionCard title="Plan" subtitle="Your store runs on your own infrastructure">
        <div className="border border-[#43A047]/30 bg-[#43A047]/5 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-bold text-gray-900">Self-hosted · Vercel</p>
              <p className="text-[12px] text-gray-500 mt-0.5">No Shopify subscription — you own the platform end to end.</p>
            </div>
            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[11px] font-semibold rounded-full">Active</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {features.map(f => (
            <div key={f} className="flex items-center gap-2 text-[13px] text-gray-700">
              <CheckCircle2 size={15} className="text-[#43A047] flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Infrastructure" subtitle="Where your store is hosted">
        <FormRow label="Hosting" hint="Serverless deployment"><span className="text-[13px] text-gray-700">Vercel</span></FormRow>
        <FormRow label="Database" hint="Managed MySQL"><span className="text-[13px] text-gray-700">TiDB Cloud</span></FormRow>
        <FormRow label="Payments" hint="Live gateway"><span className="text-[13px] text-gray-700">Razorpay + COD</span></FormRow>
      </SectionCard>
    </div>
  );
}

function BillingTab() {
  const { get, saveMany, saving } = useSettings();
  const defaults = { businessName: "", gstin: "", billingEmail: "", billingAddress: "" };
  const [settings, setSettings] = useState(defaults);
  const loaded = get("billing", null);
  useEffect(() => { if (loaded) setSettings({ ...defaults, ...loaded }); }, [loaded]);
  const save = () => saveMany({ billing: settings });

  return (
    <div>
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-5 flex items-start gap-2">
        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-blue-700">
          Your store has no platform subscription fee. Billing here covers your business details used on invoices
          and the fees charged by your payment & shipping providers (Razorpay, Shiprocket, etc.), which are billed directly by them.
        </p>
      </div>
      <SectionCard title="Billing details" subtitle="Used on customer invoices and receipts">
        <FormRow label="Business name">
          <Input value={settings.businessName} onChange={v => setSettings(s => ({ ...s, businessName: v }))} placeholder="Nutriwow" />
        </FormRow>
        <FormRow label="GSTIN" hint="Your GST registration number">
          <Input value={settings.gstin} onChange={v => setSettings(s => ({ ...s, gstin: v }))} placeholder="22AAAAA0000A1Z5" />
        </FormRow>
        <FormRow label="Billing email" hint="Where provider receipts are sent">
          <Input type="email" value={settings.billingEmail} onChange={v => setSettings(s => ({ ...s, billingEmail: v }))} placeholder="billing@nutriwow.in" />
        </FormRow>
        <FormRow label="Billing address">
          <Input value={settings.billingAddress} onChange={v => setSettings(s => ({ ...s, billingAddress: v }))} placeholder="Registered business address" />
        </FormRow>
      </SectionCard>
      <div className="flex justify-end"><SaveButton onClick={save} saving={saving} /></div>
    </div>
  );
}

function ChannelsTab() {
  const [, navigate] = useLocation();
  // Live channels — what Nutriwow actually sells through today.
  const live = [
    { name: "Online Store", icon: "🌐", desc: "www.nutriwow.in — your main website" },
    { name: "WhatsApp Business", icon: "💬", desc: "OTP login, order updates & campaigns" },
  ];
  // Catalog channels are powered by the product feeds in the Integrations tab.
  const catalog = [
    { name: "Google Shopping & Bing", icon: "🛒", desc: "Google Merchant Center / Microsoft via product feed" },
    { name: "Facebook & Instagram Shop", icon: "📘", desc: "Meta Commerce Manager via catalog feed" },
  ];

  return (
    <div>
      <SectionCard title="Active sales channels" subtitle="Where customers buy from you today">
        <div className="space-y-3">
          {live.map(c => (
            <div key={c.name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{c.icon}</span>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">{c.name}</p>
                  <p className="text-[11px] text-gray-400">{c.desc}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[11px] font-semibold rounded-full">Active</span>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Marketplace catalogs" subtitle="Sync your products to Google & Meta via the ready-made feeds">
        <div className="space-y-3">
          {catalog.map(c => (
            <div key={c.name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{c.icon}</span>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">{c.name}</p>
                  <p className="text-[11px] text-gray-400">{c.desc}</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/admin/settings/integrations")}
                className="px-3 py-1.5 border border-[#43A047] text-[#43A047] text-[12px] font-semibold rounded-lg hover:bg-[#43A047] hover:text-white transition-colors"
              >
                Set up
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function DomainsTab() {
  const { get, save, saving } = useSettings();
  const [customDomain, setCustomDomain] = useState("");
  const [draft, setDraft] = useState("");
  const loaded = get("customDomain", "");
  useEffect(() => { if (typeof loaded === "string") setCustomDomain(loaded); }, [loaded]);

  const connect = () => {
    const d = draft.trim().replace(/^https?:\/\//, "");
    if (!d) return;
    setCustomDomain(d);
    setDraft("");
    save("customDomain", d);
  };

  return (
    <div>
      <SectionCard title="Domains" subtitle="Manage your store's web addresses">
        <div className="border border-gray-200 rounded-lg p-4 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-gray-800">
                {customDomain || "www.nutriwow.in"}
              </p>
              <p className="text-[11px] text-gray-400">Primary domain</p>
            </div>
            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[11px] font-semibold rounded-full">Active</span>
          </div>
        </div>
        {customDomain && (
          <div className="border border-gray-200 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-gray-800">nutriwow.vercel.app</p>
                <p className="text-[11px] text-gray-400">Vercel default — redirects to primary</p>
              </div>
              <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-[11px] font-semibold rounded-full">Alias</span>
            </div>
          </div>
        )}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-[13px] font-semibold text-blue-800 mb-1">Connect a custom domain</p>
          <p className="text-[12px] text-blue-600 mb-3">Use your own domain like www.nutriwow.in to build brand trust. Add it in your Vercel project's Domains settings, then save it here.</p>
          <div className="flex gap-2">
            <Input value={draft} onChange={setDraft} placeholder="www.nutriwow.in" />
            <button
              onClick={connect}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 whitespace-nowrap disabled:opacity-60"
            >
              {customDomain ? "Update" : "Connect domain"}
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function EventsTab() {
  const { get, saveMany, saving } = useSettings();
  const defaults = { gtm: "", fbpixel: "", hotjar: "" };
  const [settings, setSettings] = useState(defaults);
  const loaded = get("events", null);
  useEffect(() => { if (loaded) setSettings({ ...defaults, gtm: loaded.gtm ?? "", fbpixel: loaded.fbpixel ?? "", hotjar: loaded.hotjar ?? "" }); }, [loaded]);

  const save = async () => {
    await saveMany({ events: { ...(loaded ?? {}), ...settings } });
    toast.success("Tracking settings saved!");
  };

  return (
    <div>
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-5 flex items-start gap-2">
        <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-green-700">
          Google Analytics 4 already site-wide active hai (tag G-N1EESY3X9F index.html me hardcoded).
          Niche jo IDs add karoge wo live page par inject ho jaayenge.
        </p>
      </div>
      <SectionCard title="Customer events" subtitle="Track customer behavior and analytics events">
        <FormRow label="Google Analytics 4" hint="Active site-wide (in index.html)">
          <Input value="G-N1EESY3X9F" disabled />
        </FormRow>
        <FormRow label="Google Tag Manager" hint="Container ID — injected on the storefront">
          <Input value={settings.gtm} onChange={v => setSettings(s => ({ ...s, gtm: v }))} placeholder="GTM-XXXXXXX" />
        </FormRow>
        <FormRow label="Facebook Pixel" hint="Pixel ID — injected on the storefront (also used by Integrations tab for CAPI)">
          <Input value={settings.fbpixel} onChange={v => setSettings(s => ({ ...s, fbpixel: v }))} placeholder="XXXXXXXXXXXXXXXX" />
        </FormRow>
        <FormRow label="Hotjar" hint="Site ID — injected on the storefront">
          <Input value={settings.hotjar} onChange={v => setSettings(s => ({ ...s, hotjar: v }))} placeholder="XXXXXXX" />
        </FormRow>
      </SectionCard>
      <div className="flex justify-end"><SaveButton onClick={save} saving={saving} /></div>
    </div>
  );
}

function NotificationsTab() {
  const { get, saveMany, saving } = useSettings();
  const defaults = {
    newOrder: true, orderShipped: true, orderDelivered: true, lowStock: true,
    newCustomer: false, abandonedCart: true, reviewReceived: false,
    emailFrom: "noreply@nutriwow.in", whatsappEnabled: true, whatsappNumber: "+91 95463 34633"
  };
  const [settings, setSettings] = useState(defaults);
  const loaded = get("notifications", null);
  useEffect(() => { if (loaded) setSettings({ ...defaults, ...loaded }); }, [loaded]);

  const save = async () => {
    await saveMany({ notifications: settings });
    toast.success("Notification settings saved!");
  };

  return (
    <div>
      <SectionCard title="Customer notifications" subtitle="Automated WhatsApp / email / SMS messages sent to customers (on by default)">
        {[
          { key: "newOrder", label: "Order confirmation", desc: "Sent to the customer when they place an order" },
          { key: "orderShipped", label: "Order shipped", desc: "Sent to the customer when the order is shipped" },
          { key: "orderDelivered", label: "Order delivered", desc: "Sent to the customer when the order is delivered" },
          { key: "abandonedCart", label: "Cart recovery", desc: "Reminder sent when a customer leaves items in their cart" },
        ].map(n => (
          <FormRow key={n.key} label={n.label} hint={n.desc}>
            <Toggle checked={(settings as unknown as Record<string, boolean>)[n.key] !== false} onChange={v => setSettings(s => ({ ...s, [n.key]: v }))} />
          </FormRow>
        ))}
      </SectionCard>
      <SectionCard title="Email settings">
        <FormRow label="Send from email" hint="Configure in Email → Resend Settings (current sender configured there)">
          <Input value={settings.emailFrom} onChange={v => setSettings(s => ({ ...s, emailFrom: v }))} placeholder="noreply@nutriwow.in" type="email" />
        </FormRow>
      </SectionCard>
      <SectionCard title="WhatsApp notifications" subtitle="Send order updates via WhatsApp Business API">
        <FormRow label="Enable WhatsApp" hint="Requires WhatsApp Business API account">
          <Toggle checked={settings.whatsappEnabled} onChange={v => setSettings(s => ({ ...s, whatsappEnabled: v }))} />
        </FormRow>
        {settings.whatsappEnabled && (
          <FormRow label="WhatsApp Business number">
            <Input value={settings.whatsappNumber} onChange={v => setSettings(s => ({ ...s, whatsappNumber: v }))} placeholder="+91 95463 34633" />
          </FormRow>
        )}
      </SectionCard>
      <div className="flex justify-end"><SaveButton onClick={save} saving={saving} /></div>
    </div>
  );
}

type Metafield = { id: string; name: string; key: string; type: string; appliesTo: string };

const METAFIELD_TYPES = ["Single line text", "Multi line text", "Number", "Date", "True/false", "URL", "JSON"];
const METAFIELD_OWNERS = ["Product", "Order", "Customer", "Collection"];

function MetafieldsTab() {
  const { get, save, saving } = useSettings();
  const [fields, setFields] = useState<Metafield[]>([]);
  const loaded = get("metafields", null);
  useEffect(() => { if (loaded && Array.isArray(loaded)) setFields(loaded); }, [loaded]);

  const update = (id: string, patch: Partial<Metafield>) =>
    setFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  const addField = () =>
    setFields(prev => [...prev, { id: Date.now().toString(), name: "", key: "", type: METAFIELD_TYPES[0], appliesTo: METAFIELD_OWNERS[0] }]);
  const removeField = (id: string) => setFields(prev => prev.filter(f => f.id !== id));
  const saveAll = async () => { await save("metafields", fields); toast.success("Metafields saved!"); };

  const selectCls = "w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]";

  return (
    <div>
      <SectionCard title="Metafields" subtitle="Add custom fields to products, orders, and customers">
        {fields.length === 0 ? (
          <div className="text-center py-8">
            <Database size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-gray-600">No metafields defined</p>
            <p className="text-[12px] text-gray-400 mb-4">Add custom data fields to extend your store's functionality</p>
            <button onClick={addField} className="flex items-center gap-1.5 px-4 py-2 bg-[#43A047] text-white text-[13px] font-semibold rounded-lg hover:bg-[#388E3C] mx-auto">
              <Plus size={14} /> Add metafield definition
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {fields.map(f => (
                <div key={f.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Definition</span>
                    <button onClick={() => removeField(f.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={15} /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input value={f.name} onChange={v => update(f.id, { name: v })} placeholder="Name (e.g. Shelf life)" />
                    <Input value={f.key} onChange={v => update(f.id, { key: v })} placeholder="Key (e.g. shelf_life)" />
                    <select className={selectCls} value={f.type} onChange={e => update(f.id, { type: e.target.value })}>
                      {METAFIELD_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <select className={selectCls} value={f.appliesTo} onChange={e => update(f.id, { appliesTo: e.target.value })}>
                      {METAFIELD_OWNERS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addField} className="flex items-center gap-1.5 text-[13px] text-[#43A047] font-medium hover:underline mt-3">
              <Plus size={14} /> Add metafield definition
            </button>
          </>
        )}
      </SectionCard>
      <div className="flex justify-end"><SaveButton onClick={saveAll} saving={saving} /></div>
    </div>
  );
}

const STORE_LANGUAGES = [
  { code: "en", label: "English" }, { code: "hi", label: "Hindi" }, { code: "mr", label: "Marathi" },
  { code: "gu", label: "Gujarati" }, { code: "ta", label: "Tamil" }, { code: "te", label: "Telugu" },
  { code: "bn", label: "Bengali" },
];

function LanguagesTab() {
  const { get, saveMany, saving } = useSettings();
  const defaults = { default: "en", enabled: ["en"] as string[] };
  const [lang, setLang] = useState(defaults);
  const loaded = get("language", null);
  useEffect(() => {
    if (loaded && typeof loaded === "object") setLang({ ...defaults, ...loaded });
  }, [loaded]);

  const toggleEnabled = (code: string) => {
    setLang(s => {
      const enabled = s.enabled.includes(code) ? s.enabled.filter(c => c !== code) : [...s.enabled, code];
      // never drop the default language
      const next = enabled.includes(s.default) ? enabled : [...enabled, s.default];
      return { ...s, enabled: next };
    });
  };
  const save = async () => { await saveMany({ language: lang }); toast.success("Language settings saved!"); };

  return (
    <div>
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-5 flex items-start gap-2">
        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-blue-700">
          Ek se zyada language enable karoge to storefront footer me ek language switcher (Google Translate)
          aa jaayega jisse customer poori site translate kar sakega.
        </p>
      </div>
      <SectionCard title="Store language" subtitle="The primary language of your store">
        <FormRow label="Default language">
          <select
            value={lang.default}
            onChange={e => setLang(s => ({ ...s, default: e.target.value, enabled: s.enabled.includes(e.target.value) ? s.enabled : [...s.enabled, e.target.value] }))}
            className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]"
          >
            {STORE_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </FormRow>
      </SectionCard>
      <SectionCard title="Available languages" subtitle="Languages customers can switch to on your store">
        {STORE_LANGUAGES.map(l => (
          <FormRow key={l.code} label={l.label} hint={l.code === lang.default ? "Default — always on" : undefined}>
            <Toggle checked={lang.enabled.includes(l.code)} onChange={() => toggleEnabled(l.code)} />
          </FormRow>
        ))}
      </SectionCard>
      <div className="flex justify-end"><SaveButton onClick={save} saving={saving} /></div>
    </div>
  );
}

function PrivacyTab() {
  const { get, saveMany, saving } = useSettings();
  const defaults = {
    cookieBanner: false,
    cookieMessage: "We use cookies to improve your experience, analyse traffic, and for marketing. By continuing, you accept our use of cookies.",
  };
  const [settings, setSettings] = useState(defaults);
  const loaded = get("privacy", null);
  useEffect(() => { if (loaded && typeof loaded === "object") setSettings({ ...defaults, ...loaded }); }, [loaded]);

  const save = async () => {
    await saveMany({ privacy: { ...(loaded ?? {}), ...settings } });
    toast.success("Privacy settings saved!");
  };

  return (
    <div>
      <SectionCard title="Cookie consent" subtitle="Show a cookie consent banner on your storefront">
        <FormRow label="Show cookie banner" hint="Live banner customers see on their first visit">
          <Toggle checked={settings.cookieBanner} onChange={v => setSettings(s => ({ ...s, cookieBanner: v }))} />
        </FormRow>
        {settings.cookieBanner && (
          <FormRow label="Banner message" hint="Text shown in the consent banner">
            <textarea
              value={settings.cookieMessage}
              onChange={e => setSettings(s => ({ ...s, cookieMessage: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047] resize-none"
            />
          </FormRow>
        )}
      </SectionCard>
      <p className="text-[11px] text-gray-400 mb-4">Banner ek baar accept hone par customer ko dobara nahi dikhta. Full privacy details aapke live Privacy Policy page par hain.</p>
      <div className="flex justify-end"><SaveButton onClick={save} saving={saving} /></div>
    </div>
  );
}

const POLICY_PAGES = [
  { key: "refund", title: "Refund policy", desc: "Returns, refunds & eligibility", url: "/refund-policy" },
  { key: "return", title: "Return policy", desc: "How returns are handled", url: "/return-policy" },
  { key: "shipping", title: "Shipping policy", desc: "Delivery timelines & charges", url: "/shipping-policy" },
  { key: "privacy", title: "Privacy policy", desc: "How customer data is handled", url: "/privacy-policy" },
  { key: "terms", title: "Terms & conditions", desc: "Terms of using the store", url: "/terms-and-conditions" },
] as const;

function PoliciesTab() {
  const { get, saveMany, saving } = useSettings();
  const empty = { refund: "", return: "", shipping: "", privacy: "", terms: "" };
  const [policies, setPolicies] = useState<Record<string, string>>(empty);
  const loaded = get("policies", null);
  useEffect(() => { if (loaded && typeof loaded === "object") setPolicies({ ...empty, ...loaded }); }, [loaded]);

  const save = async () => {
    await saveMany({ policies });
    toast.success("Policies saved — live pages updated!");
  };

  return (
    <div>
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-5 flex items-start gap-2">
        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-blue-700">
          Yahan jo likhoge wo seedha live policy page par dikhega. <strong>Khaali chhodoge</strong> to
          original default page (jo abhi hai) dikhta rahega. Page kholke verify karne ke liye "View" dabao.
        </p>
      </div>
      {POLICY_PAGES.map(p => (
        <SectionCard key={p.key} title={p.title} subtitle={p.desc}>
          <textarea
            value={policies[p.key] ?? ""}
            onChange={e => setPolicies(s => ({ ...s, [p.key]: e.target.value }))}
            rows={6}
            placeholder="Khaali = default page dikhega. Apna content yahan likho to wo live ho jaayega."
            className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047] resize-none"
          />
          <a href={p.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-[12px] text-[#43A047] font-semibold hover:underline">
            View live page <ExternalLink size={12} />
          </a>
        </SectionCard>
      ))}
      <div className="flex justify-end"><SaveButton onClick={save} saving={saving} /></div>
    </div>
  );
}

// ─── Integrations Tab ───────────────────────────────────────────────────────────

function IntegrationCard({ icon, title, subtitle, status, children }: {
  icon: string; title: string; subtitle: string; status?: "connected" | "not-configured"; children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-xl p-5 mb-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="text-[14px] font-semibold text-gray-900">{title}</p>
            <p className="text-[11px] text-gray-400">{subtitle}</p>
          </div>
        </div>
        {status && (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 flex-shrink-0 ${status === "connected" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {status === "connected" ? <><CheckCircle2 size={10} /> Connected</> : "Not configured"}
          </span>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 pr-10 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]" />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function IntegrationsTab() {
  const { get, saveMany, saving } = useSettings();
  const defaults = {
    pinterest_tag_id: "", microsoft_uet_id: "", snapchat_pixel_id: "",
    fb_capi_token: "", meta_pixel_id: "",
    fast2sms_key: "",
    whatsapp_token: "", whatsapp_phone_id: "1110962362096644", whatsapp_waba_id: "718666704638313",
    whatsapp_verify_token: "nutriwow_wa_verify", whatsapp_app_secret: "", whatsapp_catalog_id: "3914290288874560",
    sentry_dsn: "",
    openai_key: "", openai_model: "gpt-image-1",
    anthropic_key: "",
    shiprocket_email: "", shiprocket_password: "", shiprocket_courier: "delhivery",
    ithink_token: "", ithink_secret: "", ithink_pickup_id: "89598", ithink_logistics: "Delhivery",
    gsc_verification: "", bing_verification: "", pinterest_verification: "",
  };
  const [settings, setSettings] = useState(defaults);
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const loaded = get("integrations", null);
  useEffect(() => { if (loaded) setSettings({ ...defaults, ...loaded }); }, [loaded]);

  const save = async () => {
    await saveMany({ integrations: settings });
    toast.success("Integration settings saved!");
  };
  const s = (key: string) => (settings as Record<string, string>)[key] || "";
  const u = (key: string, v: string) => setSettings(prev => ({ ...prev, [key]: v }));

  const FEED_BASE = "https://nutriwow.in";
  const FEED_URLS = [
    { label: "Google Shopping / Microsoft Bing", url: `${FEED_BASE}/feed/google-shopping.xml`, icon: "🛒",
      hint: "Google Merchant Center → Products → Feeds → Add feed → Scheduled fetch.", platform: "Google Merchant Center / Bing", link: "https://merchants.google.com",
      steps: ["Sign in at merchants.google.com and create a Merchant Center account (free).", "Business info → add & verify your website nutriwow.in.", "Products → Feeds → click ➕ → Country: India, Language: English.", "Method: choose \"Scheduled fetch\".", "Paste the feed URL above; set fetch frequency to Daily.", "Bing: at ads.microsoft.com → Tools → Microsoft Merchant Center, import the SAME URL."] },
    { label: "Meta Catalog — Facebook & Instagram (XML)", url: `${FEED_BASE}/feed/facebook-catalog.xml`, icon: "📘",
      hint: "Meta Commerce Manager → Catalog → Data sources → Add data feed.", platform: "Meta Commerce Manager", link: "https://business.facebook.com/commerce",
      steps: ["Go to business.facebook.com → Commerce Manager.", "Create a catalog → type \"E-commerce\".", "Data sources → Add items → \"Use a data feed\".", "Paste the XML feed URL; set currency INR, Upload schedule Daily.", "Connect the catalog to your Facebook Page and Instagram."] },
    { label: "Meta Catalog (CSV)", url: `${FEED_BASE}/feed/facebook-catalog.csv`, icon: "📊",
      hint: "Alternative CSV format for Meta. Use if the XML upload fails.", platform: "Meta Commerce Manager", link: "https://business.facebook.com/commerce",
      steps: ["Same path as the Meta XML feed.", "Paste this CSV URL instead of the XML one."] },
    { label: "Pinterest Catalog", url: `${FEED_BASE}/feed/google-shopping.xml`, icon: "📌",
      hint: "Pinterest → Ads → Catalogs → Connect a data source. Pinterest accepts Google Shopping format.", platform: "Pinterest Business", link: "https://www.pinterest.com/business/hub/",
      steps: ["Sign in to a Pinterest Business account.", "Claim your website nutriwow.in.", "Ads → Catalogs → \"Connect a data source\".", "Paste the feed URL, set currency INR, daily refresh."] },
    { label: "Snapchat Catalog", url: `${FEED_BASE}/feed/facebook-catalog.csv`, icon: "👻",
      hint: "Snapchat Ads Manager → Assets → Catalogs → Create from feed URL.", platform: "Snapchat Ads Manager", link: "https://ads.snapchat.com",
      steps: ["Snapchat Ads Manager → Assets → Catalogs.", "Create catalog → \"Connect a data feed\".", "Paste the CSV URL; currency INR, Daily fetch."] },
  ];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  };

  return (
    <div>
      {/* ── WhatsApp Business API ── */}
      <SectionCard title="WhatsApp Business API" subtitle="Send order confirmations, shipping updates, and marketing campaigns via WhatsApp">
        <IntegrationCard icon="💬" title="WhatsApp Cloud API" subtitle="Meta Business Platform" status={s("whatsapp_token") ? "connected" : "not-configured"}>
          <FormRow label="Access Token" hint="From Meta → WhatsApp → API Setup → Permanent token">
            <SecretInput value={s("whatsapp_token")} onChange={v => u("whatsapp_token", v)} placeholder="EAAxxxxxx..." />
          </FormRow>
          <FormRow label="Phone Number ID" hint="The phone number used to send messages">
            <Input value={s("whatsapp_phone_id")} onChange={v => u("whatsapp_phone_id", v)} placeholder="1110962362096644" />
          </FormRow>
          <FormRow label="WABA ID" hint="WhatsApp Business Account ID">
            <Input value={s("whatsapp_waba_id")} onChange={v => u("whatsapp_waba_id", v)} placeholder="718666704638313" />
          </FormRow>
          <FormRow label="Catalog ID" hint="Product catalog linked to your WhatsApp Business">
            <Input value={s("whatsapp_catalog_id")} onChange={v => u("whatsapp_catalog_id", v)} placeholder="3914290288874560" />
          </FormRow>
          <FormRow label="Webhook Verify Token" hint="Token you set when configuring the webhook URL">
            <Input value={s("whatsapp_verify_token")} onChange={v => u("whatsapp_verify_token", v)} placeholder="nutriwow_wa_verify" />
          </FormRow>
          <FormRow label="App Secret" hint="For webhook signature verification (Meta App → Settings → Basic)">
            <SecretInput value={s("whatsapp_app_secret")} onChange={v => u("whatsapp_app_secret", v)} placeholder="App secret" />
          </FormRow>
        </IntegrationCard>
      </SectionCard>

      {/* ── Meta / Facebook ── */}
      <SectionCard title="Meta / Facebook" subtitle="Facebook Pixel, Conversions API, and Commerce">
        <IntegrationCard icon="📘" title="Meta Conversions API (CAPI)" subtitle="Server-side event tracking for better attribution" status={s("fb_capi_token") ? "connected" : "not-configured"}>
          <FormRow label="Pixel ID" hint="Your Meta Pixel ID (also used for browser pixel in index.html)">
            <Input value={s("meta_pixel_id")} onChange={v => u("meta_pixel_id", v)} placeholder="1753762272279602" />
          </FormRow>
          <FormRow label="Conversions API Token" hint="Events Manager → Settings → Generate access token">
            <SecretInput value={s("fb_capi_token")} onChange={v => u("fb_capi_token", v)} placeholder="EAAxxxxxx..." />
          </FormRow>
        </IntegrationCard>
      </SectionCard>

      {/* ── SMS ── */}
      <SectionCard title="SMS Notifications" subtitle="Send order confirmation SMS to customers">
        <IntegrationCard icon="📱" title="Fast2SMS" subtitle="Bulk SMS provider for India" status={s("fast2sms_key") ? "connected" : "not-configured"}>
          <FormRow label="API Key" hint="From fast2sms.com → Dev API → Authorization Key">
            <SecretInput value={s("fast2sms_key")} onChange={v => u("fast2sms_key", v)} placeholder="Your Fast2SMS API key" />
          </FormRow>
        </IntegrationCard>
      </SectionCard>

      {/* ── Shipping Providers ── */}
      <SectionCard title="Shipping Providers" subtitle="Logistics API credentials for creating shipments from orders">
        <IntegrationCard icon="🚚" title="Shiprocket" subtitle="India's largest shipping aggregator — 25+ courier partners" status={s("shiprocket_email") ? "connected" : "not-configured"}>
          <FormRow label="Email" hint="Shiprocket account login email">
            <Input value={s("shiprocket_email")} onChange={v => u("shiprocket_email", v)} placeholder="your@email.com" />
          </FormRow>
          <FormRow label="Password" hint="Shiprocket account password">
            <SecretInput value={s("shiprocket_password")} onChange={v => u("shiprocket_password", v)} placeholder="Password" />
          </FormRow>
          <FormRow label="Preferred Courier" hint="Default courier partner for shipments">
            <Input value={s("shiprocket_courier")} onChange={v => u("shiprocket_courier", v)} placeholder="delhivery" />
          </FormRow>
        </IntegrationCard>

        <IntegrationCard icon="📦" title="iThink Logistics" subtitle="Delhivery, FedEx, Xpressbees & more" status={s("ithink_token") ? "connected" : "not-configured"}>
          <FormRow label="Access Token" hint="From iThink Logistics dashboard → API Settings">
            <SecretInput value={s("ithink_token")} onChange={v => u("ithink_token", v)} placeholder="Access token" />
          </FormRow>
          <FormRow label="Secret Key" hint="API secret key">
            <SecretInput value={s("ithink_secret")} onChange={v => u("ithink_secret", v)} placeholder="Secret key" />
          </FormRow>
          <FormRow label="Pickup ID" hint="Default pickup location ID">
            <Input value={s("ithink_pickup_id")} onChange={v => u("ithink_pickup_id", v)} placeholder="89598" />
          </FormRow>
          <FormRow label="Logistics Provider" hint="Default logistics provider">
            <Input value={s("ithink_logistics")} onChange={v => u("ithink_logistics", v)} placeholder="Delhivery" />
          </FormRow>
        </IntegrationCard>
      </SectionCard>

      {/* ── AI Services ── */}
      <SectionCard title="AI Services" subtitle="AI-powered features for content generation and image creation">
        <IntegrationCard icon="🤖" title="Anthropic Claude" subtitle="AI email campaign generation" status={s("anthropic_key") ? "connected" : "not-configured"}>
          <FormRow label="API Key" hint="From console.anthropic.com → API Keys">
            <SecretInput value={s("anthropic_key")} onChange={v => u("anthropic_key", v)} placeholder="sk-ant-xxxxx" />
          </FormRow>
        </IntegrationCard>

        <IntegrationCard icon="🎨" title="OpenAI" subtitle="AI image generation for blog covers" status={s("openai_key") ? "connected" : "not-configured"}>
          <FormRow label="API Key" hint="From platform.openai.com → API Keys">
            <SecretInput value={s("openai_key")} onChange={v => u("openai_key", v)} placeholder="sk-xxxxx" />
          </FormRow>
          <FormRow label="Image Model" hint="gpt-image-1 (recommended) or dall-e-3">
            <select value={s("openai_model") || "gpt-image-1"} onChange={e => u("openai_model", e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]">
              <option value="gpt-image-1">gpt-image-1</option>
              <option value="dall-e-3">dall-e-3</option>
            </select>
          </FormRow>
        </IntegrationCard>
      </SectionCard>

      {/* ── Error Tracking ── */}
      <SectionCard title="Error Tracking" subtitle="Monitor and track application errors">
        <IntegrationCard icon="🔍" title="Sentry" subtitle="Error monitoring and performance tracking" status={s("sentry_dsn") ? "connected" : "not-configured"}>
          <FormRow label="DSN" hint="Sentry project DSN (from sentry.io → Settings → Client Keys)">
            <Input value={s("sentry_dsn")} onChange={v => u("sentry_dsn", v)} placeholder="https://xxxxx@o12345.ingest.sentry.io/12345" />
          </FormRow>
          <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-[11px] text-green-700 flex items-center gap-1.5"><CheckCircle2 size={11} /> Sentry is pre-configured in the codebase with a default DSN. Override above only if using a different project.</p>
          </div>
        </IntegrationCard>
      </SectionCard>

      {/* ── Tracking Pixels ── */}
      <SectionCard title="Tracking Pixels" subtitle="Third-party tracking tags injected on the storefront">
        <FormRow label="Pinterest Tag ID" hint="Pinterest Ads Manager → Conversions → Pinterest Tag">
          <Input value={s("pinterest_tag_id")} onChange={v => u("pinterest_tag_id", v)} placeholder="e.g. 2613795545678" />
        </FormRow>
        <FormRow label="Microsoft UET Tag ID" hint="Microsoft Advertising → Tools → UET Tags">
          <Input value={s("microsoft_uet_id")} onChange={v => u("microsoft_uet_id", v)} placeholder="e.g. 12345678" />
        </FormRow>
        <FormRow label="Snapchat Pixel ID" hint="Snapchat Ads Manager → Events Manager → Snap Pixel">
          <Input value={s("snapchat_pixel_id")} onChange={v => u("snapchat_pixel_id", v)} placeholder="e.g. abc123de-fg45-..." />
        </FormRow>
        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-[11px] text-blue-700 flex items-center gap-1.5"><Info size={11} /> Google Analytics 4, Facebook Pixel, GTM, and Hotjar are configured in Settings → Customer Events.</p>
        </div>
      </SectionCard>

      {/* ── Product Feed URLs ── */}
      <SectionCard title="Product Feed URLs" subtitle="Submit these URLs to shopping platforms to list your products">
        <div className="space-y-4">
          {FEED_URLS.map(feed => (
            <div key={feed.label} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{feed.icon}</span>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900">{feed.label}</p>
                    <p className="text-[11px] text-gray-400">{feed.platform}</p>
                  </div>
                </div>
                <button onClick={() => copyToClipboard(feed.url, feed.label)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#43A047] border border-[#43A047] rounded-lg hover:bg-green-50 transition-colors flex-shrink-0">
                  <Copy size={12} /> Copy URL
                </button>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 mb-2">
                <code className="text-[11px] text-gray-600 flex-1 truncate">{feed.url}</code>
                <a href={feed.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#43A047] flex-shrink-0"><ExternalLink size={13} /></a>
              </div>
              <p className="text-[11px] text-gray-500 flex items-start gap-1 mb-2"><Info size={11} className="mt-0.5 flex-shrink-0 text-blue-400" />{feed.hint}</p>
              <button onClick={() => setOpenGuide(openGuide === feed.label ? null : feed.label)}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-[#43A047] hover:underline">
                <ChevronDown size={14} className={`transition-transform ${openGuide === feed.label ? "rotate-180" : ""}`} />
                {openGuide === feed.label ? "Hide setup guide" : "How to set up"}
              </button>
              {openGuide === feed.label && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <ol className="text-[12px] text-gray-700 space-y-1.5 list-decimal list-outside pl-4">
                    {feed.steps.map((step, i) => <li key={i}>{step}</li>)}
                  </ol>
                  <a href={feed.link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-[12px] font-semibold text-blue-600 hover:underline">
                    Open {feed.platform} <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700">
            Feeds update automatically — set each platform to <strong>Scheduled / Daily fetch</strong> so products sync on their own.
          </p>
        </div>
      </SectionCard>

      {/* ── SEO & Verification ── */}
      <SectionCard title="SEO & Verification" subtitle="Search engine verification codes for indexing and site ownership">
        <IntegrationCard icon="🔍" title="Google Search Console" subtitle="Verify site ownership with Google" status={s("gsc_verification") ? "connected" : "not-configured"}>
          <FormRow label="Verification Code" hint='Paste the content value from <meta name="google-site-verification" content="YOUR_CODE">'>
            <Input value={s("gsc_verification")} onChange={v => u("gsc_verification", v)} placeholder="Google verification code" />
          </FormRow>
        </IntegrationCard>
        <IntegrationCard icon="🔎" title="Bing Webmaster Tools" subtitle="Verify site ownership with Bing" status={s("bing_verification") ? "connected" : "not-configured"}>
          <FormRow label="Verification Code" hint='Paste the content value from <meta name="msvalidate.01" content="YOUR_CODE">'>
            <Input value={s("bing_verification")} onChange={v => u("bing_verification", v)} placeholder="Bing verification code" />
          </FormRow>
        </IntegrationCard>
        <IntegrationCard icon="📌" title="Pinterest Verification" subtitle="Verify site ownership with Pinterest" status={s("pinterest_verification") ? "connected" : "not-configured"}>
          <FormRow label="Verification Code" hint='Paste the content value from <meta name="p:domain_verify" content="YOUR_CODE">'>
            <Input value={s("pinterest_verification")} onChange={v => u("pinterest_verification", v)} placeholder="Pinterest verification code" />
          </FormRow>
        </IntegrationCard>
      </SectionCard>

      <div className="flex justify-end"><SaveButton onClick={save} saving={saving} /></div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminSettings() {
  const [location, navigate] = useLocation();
  const pathTab = location.replace("/admin/settings", "").replace(/^\//, "") || "general";
  const [activeTab, setActiveTab] = useState(pathTab);

  useEffect(() => {
    const tab = location.replace("/admin/settings", "").replace(/^\//, "") || "general";
    setActiveTab(tab);
  }, [location]);

  const TAB_COMPONENTS: Record<string, React.ReactNode> = {
    general: <GeneralTab />,
    plan: <PlanTab />,
    billing: <BillingTab />,
    users: <UsersTab />,
    payments: <PaymentsTab />,
    checkout: <CheckoutTab />,
    accounts: <AccountsTab />,
    shipping: <ShippingTab />,
    taxes: <TaxesTab />,
    locations: <LocationsTab />,
    channels: <ChannelsTab />,
    domains: <DomainsTab />,
    events: <EventsTab />,
    notifications: <NotificationsTab />,
    metafields: <MetafieldsTab />,
    languages: <LanguagesTab />,
    privacy: <PrivacyTab />,
    policies: <PoliciesTab />,
    integrations: <IntegrationsTab />,
  };

  const activeTabInfo = SETTINGS_TABS.find(t => t.id === activeTab);
  const activeContent = TAB_COMPONENTS[activeTab];

  return (
    <AdminLayout title="Settings" subtitle="Manage your store configuration">
      <div className="flex h-full">
        <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <nav className="py-3">
            {SETTINGS_TABS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id); navigate(`/admin/settings/${id}`); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-all text-left ${
                  activeTab === id
                    ? "bg-[#43A047]/10 text-[#43A047] border-r-2 border-[#43A047]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon size={15} className={activeTab === id ? "text-[#43A047]" : "text-gray-400"} />
                <span className="truncate">{label}</span>
                {activeTab === id && <ChevronRight size={13} className="ml-auto text-[#43A047]" />}
              </button>
            ))}
          </nav>
        </aside>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-6">
            {activeTabInfo && activeContent ? (
              <>
                <div className="mb-5">
                  <h2 className="text-[18px] font-bold text-gray-900">{activeTabInfo.label}</h2>
                </div>
                {activeContent}
              </>
            ) : (
              <div className="text-center py-16">
                <AlertCircle size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-[15px] font-semibold text-gray-700">Settings page not found</p>
                <p className="text-[12px] text-gray-400 mb-5">
                  The &ldquo;{activeTab}&rdquo; settings page doesn&rsquo;t exist or has moved.
                </p>
                <button
                  onClick={() => { setActiveTab("general"); navigate("/admin/settings/general"); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#43A047] text-white text-[13px] font-semibold rounded-lg hover:bg-[#388E3C]"
                >
                  <Settings size={14} /> Go to General settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
