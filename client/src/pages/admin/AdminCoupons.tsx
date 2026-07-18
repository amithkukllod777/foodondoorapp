/*
 * Nutriwow Admin - Coupons Page (DB-backed via tRPC)
 * Shopify-style: clean table, slide-over create panel, toggle active/inactive
 */

import { useState } from "react";
import { Plus, Trash2, Tag, X, Copy, ToggleLeft, ToggleRight, AlertTriangle, Star } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type DiscountType = "percent" | "flat";

interface CouponForm {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number | "";
  minOrderAmount: number | "";
  maxUses: number | "";
  perUserLimit: number | "";
  isActive: boolean;
  isFeatured: boolean;
  expiresAt: string;
}

const defaultForm: CouponForm = {
  code: "",
  description: "",
  discountType: "percent",
  discountValue: "",
  minOrderAmount: "",
  maxUses: "",
  perUserLimit: "",
  isActive: true,
  isFeatured: false,
  expiresAt: "",
};

export default function AdminCoupons() {
  const utils = trpc.useUtils();
  const { data: coupons = [], isLoading } = trpc.coupons.getAll.useQuery();

  const createMutation = trpc.coupons.create.useMutation({
    onSuccess: () => {
      utils.coupons.getAll.invalidate();
      setShowPanel(false);
      setForm(defaultForm);
      toast.success("Coupon created! New coupon is now active.");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.coupons.update.useMutation({
    onSuccess: () => {
      utils.coupons.getAll.invalidate();
      toast.success("Coupon updated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.coupons.delete.useMutation({
    onSuccess: () => {
      utils.coupons.getAll.invalidate();
      setDeleteConfirm(null);
      toast.success("Coupon deleted.");
    },
    onError: (e) => toast.error(e.message),
  });

  const [showPanel, setShowPanel] = useState(false);
  const [form, setForm] = useState<CouponForm>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const handleCreate = () => {
    if (!form.code.trim()) { toast.error("Coupon code required"); return; }
    if (!form.discountValue || Number(form.discountValue) <= 0) { toast.error("Discount value required"); return; }
    createMutation.mutate({
      code: form.code.trim().toUpperCase(),
      description: form.description || undefined,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderAmount: Number(form.minOrderAmount) || 0,
      maxUses: Number(form.maxUses) || 0,
      perUserLimit: Number(form.perUserLimit) || 0,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      // Expire at END of the selected day in IST (not UTC midnight), so a coupon
      // "expiring 14 July" stays valid through all of 14 July in India (NW-DATA-04).
      expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59+05:30`) : null,
    });
  };

  const toggleActive = (id: number, current: boolean) => {
    updateMutation.mutate({ id, isActive: !current });
  };

  const toggleFeatured = (id: number, current: boolean) => {
    updateMutation.mutate({ id, isFeatured: !current });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`${code} copied to clipboard`);
  };

  const activeCoupons = coupons.filter((c) => c.isActive).length;

  return (
    <AdminLayout
      title="Coupons"
      subtitle={`${coupons.length} total · ${activeCoupons} active`}
      actions={
        <button
          onClick={() => setShowPanel(true)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#43A047] px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          <Plus size={14} /> Create Coupon
        </button>
      }
    >
      <div className="p-4 lg:p-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total Coupons", value: coupons.length, color: "text-gray-900" },
            { label: "Active", value: activeCoupons, color: "text-green-700" },
            { label: "Inactive", value: coupons.length - activeCoupons, color: "text-gray-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-[13px] font-semibold text-gray-900">All Coupons</h2>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
          ) : coupons.length === 0 ? (
            <div className="py-16 text-center">
              <Tag size={28} className="mx-auto text-gray-200 mb-3" />
              <p className="text-[13px] font-medium text-gray-500 mb-1">No coupons yet</p>
              <button
                onClick={() => setShowPanel(true)}
                className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#43A047] px-4 py-2 rounded-lg hover:bg-green-700 mx-auto"
              >
                <Plus size={13} /> Create Coupon
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Code</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Discount</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Min Order</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Uses</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Expires</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                            {coupon.code}
                          </span>
                          <button
                            onClick={() => copyCode(coupon.code)}
                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        {coupon.isFeatured && (
                          <span className="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold">
                            <Star size={9} /> Featured
                          </span>
                        )}
                        {coupon.description && (
                          <p className="text-[11px] text-gray-400 mt-0.5">{coupon.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[13px] font-bold text-[#43A047]">
                          {coupon.discountType === "percent" ? `${coupon.discountValue}% off` : `₹${coupon.discountValue} off`}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-gray-500 hidden sm:table-cell">
                        {coupon.minOrderAmount > 0 ? `Min ₹${coupon.minOrderAmount}` : "No minimum"}
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-gray-500 hidden md:table-cell">
                        {coupon.usedCount}{coupon.maxUses > 0 ? ` / ${coupon.maxUses}` : ""} uses
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-gray-500 hidden lg:table-cell">
                        {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString("en-IN") : "Never"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => toggleActive(coupon.id, coupon.isActive)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                              coupon.isActive
                                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            {coupon.isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                            {coupon.isActive ? "Active" : "Inactive"}
                          </button>
                          <button
                            onClick={() => toggleFeatured(coupon.id, coupon.isFeatured)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                              coupon.isFeatured
                                ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                                : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            <Star size={11} />
                            {coupon.isFeatured ? "Featured" : "Not Featured"}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setDeleteConfirm(coupon.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Panel */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setShowPanel(false)} />
          <div className="w-full max-w-[380px] bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-[14px] font-bold text-gray-900">Create Coupon</h2>
              <button onClick={() => setShowPanel(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Coupon Code *</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SAVE20"
                  className="w-full px-3 py-2.5 text-[13px] font-mono font-bold border border-gray-200 rounded-lg focus:outline-none focus:border-[#43A047] transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. 10% off on first order"
                  className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#43A047] transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Discount Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setForm({ ...form, discountType: "percent" })}
                    className={`flex-1 py-2.5 text-[12px] font-semibold rounded-lg border transition-all ${
                      form.discountType === "percent" ? "bg-[#43A047] text-white border-[#43A047]" : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    % Percent
                  </button>
                  <button
                    onClick={() => setForm({ ...form, discountType: "flat" })}
                    className={`flex-1 py-2.5 text-[12px] font-semibold rounded-lg border transition-all ${
                      form.discountType === "flat" ? "bg-[#43A047] text-white border-[#43A047]" : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    ₹ Flat
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Discount Value * {form.discountType === "percent" ? "(%)" : "(₹)"}
                </label>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value ? Number(e.target.value) : "" })}
                  placeholder={form.discountType === "percent" ? "10" : "50"}
                  min={1}
                  max={form.discountType === "percent" ? 100 : undefined}
                  className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#43A047] transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Minimum Order (₹)</label>
                <input
                  type="number"
                  value={form.minOrderAmount}
                  onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value ? Number(e.target.value) : "" })}
                  placeholder="0 = no minimum"
                  min={0}
                  className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#43A047] transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Max Uses (0 = unlimited)</label>
                <input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value ? Number(e.target.value) : "" })}
                  placeholder="0 = unlimited"
                  min={0}
                  className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#43A047] transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Per-customer Limit (0 = unlimited)</label>
                <input
                  type="number"
                  value={form.perUserLimit}
                  onChange={(e) => setForm({ ...form, perUserLimit: e.target.value ? Number(e.target.value) : "" })}
                  placeholder="0 = unlimited"
                  min={0}
                  className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#43A047] transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Expiry Date (optional)</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#43A047] transition-colors"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isActive ? "bg-[#43A047]" : "bg-gray-300"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <span className="text-[12px] text-gray-600">Active immediately</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setForm({ ...form, isFeatured: !form.isFeatured })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isFeatured ? "bg-amber-500" : "bg-gray-300"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isFeatured ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <span className="text-[12px] text-gray-600">Featured on storefront</span>
              </div>
            </div>
            <div className="border-t border-gray-200 p-4 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setShowPanel(false)}
                className="flex-1 py-2.5 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="flex-1 py-2.5 text-[13px] font-bold text-white bg-[#43A047] rounded-lg hover:bg-green-700 shadow-sm disabled:opacity-60"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-gray-900">Delete Coupon?</h3>
                <p className="text-[12px] text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id: deleteConfirm })}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 text-[13px] font-bold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
