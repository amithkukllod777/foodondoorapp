/**
 * Admin Subscriptions — read-only view of all Subscribe & Save subscriptions
 */

import { useState } from "react";
import { CalendarClock, Search, Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";

type StatusFilter = "all" | "active" | "paused" | "cancelled";

export default function AdminSubscriptions() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const { data: subscriptions = [], isLoading } = trpc.subscription.adminList.useQuery();

  const filtered = (subscriptions as any[]).filter((sub: any) => {
    if (statusFilter !== "all" && sub.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (sub.productName || "").toLowerCase().includes(q) ||
        (sub.customerName || "").toLowerCase().includes(q) ||
        (sub.customerPhone || "").includes(q)
      );
    }
    return true;
  });

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarClock size={24} className="text-[#43A047]" />
            <h1 className="text-xl font-bold text-gray-900">Subscriptions</h1>
            <span className="text-sm text-gray-500">({filtered.length})</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product, customer, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(["all", "active", "paused", "cancelled"] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                  statusFilter === s ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-20">
            <Loader2 size={32} className="text-green-400 mx-auto mb-3 animate-spin" />
            <p className="text-gray-500 text-sm">Loading subscriptions...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <CalendarClock size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No subscriptions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Customer</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Product</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Variant</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Qty</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Frequency</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Next Delivery</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub: any) => {
                  const variants = ["250g", "500g", "1kg"];
                  return (
                    <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{sub.customerName || "—"}</p>
                        <p className="text-xs text-gray-400">{sub.customerPhone || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {sub.productImage && (
                            <img src={sub.productImage} alt="" className="w-8 h-8 object-contain rounded bg-gray-50" />
                          )}
                          <span className="text-gray-900">{sub.productName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{variants[sub.variantIdx] || "250g"}</td>
                      <td className="px-4 py-3 text-gray-600">{sub.quantity}</td>
                      <td className="px-4 py-3 text-gray-600">Every {sub.frequencyDays}d</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[sub.status] || "bg-gray-100 text-gray-600"}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {sub.nextDeliveryDate
                          ? new Date(sub.nextDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {sub.createdAt
                          ? new Date(sub.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
