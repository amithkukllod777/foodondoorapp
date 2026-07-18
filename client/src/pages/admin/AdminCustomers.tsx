/**
 * Nutriwow Admin - Customers Page
 * DB-backed: derives customer list from real orders in DB via tRPC
 * Includes customer segmentation engine with color-coded badges and filters
 */

import { useMemo, useRef, useState } from "react";
import { Search, Users, ShoppingBag, X, Loader2, Upload, Download, Star, Filter } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";

type Segment = "New" | "First-Timer" | "Active" | "VIP" | "At-Risk" | "Dormant" | "Churned";

const SEGMENT_CONFIG: Record<Segment, { bg: string; text: string; label: string }> = {
  "New":         { bg: "bg-gray-100",    text: "text-gray-600",   label: "New" },
  "First-Timer": { bg: "bg-blue-100",    text: "text-blue-700",   label: "First-Timer" },
  "Active":      { bg: "bg-green-100",   text: "text-green-700",  label: "Active" },
  "VIP":         { bg: "bg-amber-100",   text: "text-amber-700",  label: "VIP" },
  "At-Risk":     { bg: "bg-orange-100",  text: "text-orange-700", label: "At-Risk" },
  "Dormant":     { bg: "bg-red-50",      text: "text-red-400",    label: "Dormant" },
  "Churned":     { bg: "bg-red-100",     text: "text-red-600",    label: "Churned" },
};

const ALL_SEGMENTS: Segment[] = ["VIP", "Active", "First-Timer", "New", "At-Risk", "Dormant", "Churned"];

function SegmentBadge({ segment }: { segment: Segment }) {
  const cfg = SEGMENT_CONFIG[segment] || SEGMENT_CONFIG["New"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
      {segment === "VIP" && <Star size={10} className="fill-current" />}
      {cfg.label}
    </span>
  );
}

interface Customer {
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  orderCount: number;
  totalSpend: number;
  lastOrderDate: string;
  segment: Segment;
  orders: {
    id: string;
    total: number;
    status: string;
    createdAt: string | Date;
    items: any[];
  }[];
}

function CustomerDetailPanel({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-[420px] bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#43A047] flex items-center justify-center text-white font-bold text-[14px]">
              {customer.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-bold text-gray-900">{customer.name}</h2>
                <SegmentBadge segment={customer.segment} />
              </div>
              <p className="text-[11px] text-gray-400">{customer.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 p-5 border-b border-gray-100">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[18px] font-bold text-gray-900">{customer.orderCount}</p>
              <p className="text-[11px] text-gray-500">Total Orders</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-[18px] font-bold text-[#43A047]">₹{customer.totalSpend.toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-gray-500">Total Spend</p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact Info</p>
            <div className="space-y-2">
              <div className="flex justify-between text-[12px]">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium text-gray-800">{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex justify-between text-[12px]">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-gray-800">{customer.email}</span>
                </div>
              )}
              <div className="flex justify-between text-[12px]">
                <span className="text-gray-500">Location</span>
                <span className="font-medium text-gray-800">{[customer.city, customer.state].filter(Boolean).join(", ") || "—"}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-gray-500">Last Order</span>
                <span className="font-medium text-gray-800">
                  {customer.lastOrderDate
                    ? new Date(customer.lastOrderDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Order History */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Order History</p>
            <div className="space-y-3">
              {customer.orders.length === 0 && (
                <p className="text-[12px] text-gray-400">No orders yet — added via import.</p>
              )}
              {customer.orders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-[12px] font-semibold text-gray-900">#{order.id}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {" · "}{(order.items as any[]).length} item{(order.items as any[]).length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-bold text-gray-900">₹{order.total.toLocaleString("en-IN")}</p>
                    <span className={`text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full ${
                      order.status === "delivered" ? "bg-green-100 text-green-700" :
                      order.status === "cancelled" ? "bg-red-100 text-red-600" :
                      order.status === "shipped" ? "bg-purple-100 text-purple-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>{order.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function parseShopifyCSV(text: string) {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  const firstNameIdx = headers.indexOf("First Name");
  const lastNameIdx = headers.indexOf("Last Name");
  const emailIdx = headers.indexOf("Email");
  const phoneIdx = headers.indexOf("Phone");
  const addrPhoneIdx = headers.findIndex(h => h.includes("Address Phone"));

  const results: { phone: string; name?: string; email?: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols: string[] = [];
    let cur = "", inQuotes = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());

    let rawPhone = (phoneIdx >= 0 ? cols[phoneIdx] : "") || (addrPhoneIdx >= 0 ? cols[addrPhoneIdx] : "");
    rawPhone = rawPhone.replace(/[^0-9]/g, "").slice(-10);
    if (rawPhone.length !== 10) continue;

    const first = (firstNameIdx >= 0 ? cols[firstNameIdx] : "") || "";
    const last = (lastNameIdx >= 0 ? cols[lastNameIdx] : "") || "";
    const nameParts = [first, last].filter(p => p && p !== "-").join(" ").trim();
    const email = (emailIdx >= 0 ? cols[emailIdx] : "") || "";

    results.push({
      phone: rawPhone,
      name: nameParts || undefined,
      email: email && email.includes("@") ? email : undefined,
    });
  }
  return results;
}

/** Compute segment on the client from order data (fallback when server segments not loaded) */
function computeSegment(orderCount: number, totalSpend: number, lastOrderDate: string): Segment {
  if (orderCount === 0) return "New";
  const daysSince = lastOrderDate ? Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / 86400000) : 999;
  if (daysSince > 180) return "Churned";
  if (daysSince > 120) return "Dormant";
  if (orderCount >= 5 || totalSpend > 5000) return "VIP"; // totalSpend already in rupees here
  if (orderCount >= 2 && daysSince > 60) return "At-Risk";
  if (orderCount >= 2 && daysSince <= 60) return "Active";
  if (orderCount === 1 && daysSince <= 30) return "First-Timer";
  return "New";
}

export default function AdminCustomers() {
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<Segment | "All">("All");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: allOrders, isLoading } = trpc.adminOrders.getAll.useQuery();
  const { data: profiles } = trpc.customers.getAll.useQuery();
  // Server-computed segments (keyed by phone for fast lookup)
  const { data: serverSegments } = trpc.analytics.customerSegments.useQuery();
  const { data: segmentSummary } = trpc.analytics.segmentSummary.useQuery();

  const bulkImport = trpc.customers.bulkImport.useMutation({
    onSuccess: (data) => {
      setImportStatus(`Done! ${data.created} created, ${data.updated} updated, ${data.skipped} skipped`);
      utils.customers.getAll.invalidate();
      utils.analytics.customerSegments.invalidate();
      utils.analytics.segmentSummary.invalidate();
    },
    onError: (err) => setImportStatus(`Error: ${err.message}`),
  });

  // Build phone->segment lookup from server data
  const segmentMap = useMemo(() => {
    const map: Record<string, Segment> = {};
    (serverSegments ?? []).forEach((s: any) => {
      const norm = (s.phone || "").replace(/[^0-9]/g, "").slice(-10);
      if (norm) map[norm] = s.segment;
    });
    return map;
  }, [serverSegments]);

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseShopifyCSV(reader.result as string);
      if (parsed.length === 0) { setImportStatus("No valid customers found in CSV"); return; }
      setImportStatus(`Importing ${parsed.length} customers...`);
      bulkImport.mutate({ customers: parsed });
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const customers = useMemo<Customer[]>(() => {
    const norm = (p: string) => (p || "").replace(/[^0-9]/g, "").slice(-10);
    const map: Record<string, Customer> = {};
    const seen = new Set<string>();
    (allOrders ?? []).forEach((order: any) => {
      const key = order.phone;
      if (!map[key]) {
        map[key] = {
          name: order.customerName,
          email: order.email ?? "",
          phone: order.phone,
          city: order.city,
          state: order.state,
          orderCount: 0,
          totalSpend: 0,
          lastOrderDate: order.createdAt,
          segment: "New",
          orders: [],
        };
      }
      map[key].orderCount++;
      map[key].totalSpend += order.total;
      map[key].orders.push(order);
      if (new Date(order.createdAt) > new Date(map[key].lastOrderDate)) {
        map[key].lastOrderDate = order.createdAt;
      }
      seen.add(norm(order.phone));
    });
    // Imported-only customers (in customerProfiles, no orders placed yet).
    (profiles ?? []).forEach((p: any) => {
      const n = norm(p.phone);
      if (!n || seen.has(n)) return;
      seen.add(n);
      map[`profile:${p.phone}`] = {
        name: p.name || "—",
        email: p.email ?? "",
        phone: p.phone,
        city: "",
        state: "",
        orderCount: 0,
        totalSpend: 0,
        lastOrderDate: "",
        segment: "New",
        orders: [],
      };
    });

    // Assign segments: prefer server-computed, fall back to client computation
    const result = Object.values(map);
    result.forEach(c => {
      const n = norm(c.phone);
      c.segment = segmentMap[n] || computeSegment(c.orderCount, c.totalSpend, c.lastOrderDate);
    });

    return result.sort((a, b) => b.totalSpend - a.totalSpend);
  }, [allOrders, profiles, segmentMap]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(c => {
      if (segmentFilter !== "All" && c.segment !== segmentFilter) return false;
      return c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.city.toLowerCase().includes(q);
    });
  }, [customers, search, segmentFilter]);

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpend, 0);

  // Segment summary: use server data if available, otherwise compute from client
  const summaryData = useMemo(() => {
    if (segmentSummary && segmentSummary.length > 0) {
      return ALL_SEGMENTS.map(seg => {
        const found = (segmentSummary as any[]).find((s: any) => s.segment === seg);
        return { segment: seg, count: found?.count || 0, revenue: found?.totalRevenue || 0 };
      });
    }
    const counts: Record<Segment, { count: number; revenue: number }> = {
      "New": { count: 0, revenue: 0 }, "First-Timer": { count: 0, revenue: 0 },
      "Active": { count: 0, revenue: 0 }, "VIP": { count: 0, revenue: 0 },
      "At-Risk": { count: 0, revenue: 0 }, "Dormant": { count: 0, revenue: 0 },
      "Churned": { count: 0, revenue: 0 },
    };
    customers.forEach(c => {
      counts[c.segment].count++;
      counts[c.segment].revenue += c.totalSpend;
    });
    return ALL_SEGMENTS.map(seg => ({ segment: seg, count: counts[seg].count, revenue: counts[seg].revenue }));
  }, [segmentSummary, customers]);

  // Export the currently-filtered customers to CSV (marketing list / backup).
  const handleExportCSV = () => {
    if (filtered.length === 0) { setImportStatus("No customers to export"); return; }
    const headers = ["Name", "Phone", "Email", "City", "State", "Segment", "Orders", "Total Spend", "Last Order"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map(c => [
      c.name, c.phone, c.email, c.city, c.state, c.segment, c.orderCount, c.totalSpend,
      c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString("en-IN") : "",
    ].map(esc).join(","));
    const csv = [headers.map(esc).join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nutriwow-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setImportStatus(`Exported ${filtered.length} customers`);
  };

  return (
    <AdminLayout
      title="Customers"
      subtitle={`${customers.length} total`}
    >
      <div className="p-4 lg:p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Total Customers", value: customers.length, color: "text-gray-900" },
            { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}`, color: "text-[#43A047]" },
            { label: "Avg. Spend", value: `₹${customers.length ? Math.round(totalRevenue / customers.length).toLocaleString("en-IN") : 0}`, color: "text-blue-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Segment Summary */}
        <div className="grid grid-cols-7 gap-2 mb-5">
          {summaryData.map(({ segment, count }) => {
            const cfg = SEGMENT_CONFIG[segment];
            const isActive = segmentFilter === segment;
            return (
              <button key={segment}
                onClick={() => setSegmentFilter(segmentFilter === segment ? "All" : segment)}
                className={`rounded-xl border p-3 text-center transition-all ${
                  isActive
                    ? "border-[#43A047] ring-1 ring-[#43A047] bg-white"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}>
                <p className="text-[16px] font-bold text-gray-900">{count}</p>
                <p className={`text-[9px] font-semibold ${cfg.text} mt-0.5`}>{cfg.label}</p>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Search Bar + Filter + Import */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search customers..."
                className="w-full pl-8 pr-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#43A047] bg-gray-50 transition-colors" />
            </div>
            <div className="relative">
              <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select value={segmentFilter} onChange={e => setSegmentFilter(e.target.value as Segment | "All")}
                className="pl-7 pr-6 py-2 text-[11px] border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-[#43A047] appearance-none cursor-pointer">
                <option value="All">All Segments</option>
                {ALL_SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <span className="text-[11px] text-gray-400">{filtered.length} customers</span>
            <button onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <Download size={13} />
              Export CSV
            </button>
            <label className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-white bg-[#43A047] rounded-lg cursor-pointer hover:bg-[#388E3C] transition-colors">
              <Upload size={13} />
              Import CSV
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
            </label>
          </div>
          {importStatus && (
            <div className={`px-4 py-2 text-[12px] ${importStatus.startsWith("Error") ? "bg-red-50 text-red-700" : importStatus.startsWith("Done") ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"} flex items-center justify-between`}>
              <span>{importStatus}</span>
              {!bulkImport.isPending && <button onClick={() => setImportStatus(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>}
            </div>
          )}

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 size={28} className="mx-auto text-gray-300 mb-3 animate-spin" />
              <p className="text-[13px] text-gray-400">Loading customers...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={28} className="mx-auto text-gray-200 mb-3" />
              <p className="text-[13px] font-medium text-gray-500">No customers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Segment</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Location</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Orders</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Spend</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Last Order</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(customer => (
                    <tr key={customer.phone} className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedCustomer(customer)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#43A047]/10 flex items-center justify-center text-[#43A047] font-bold text-[12px] flex-shrink-0">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-gray-900">{customer.name}</p>
                            <p className="text-[10px] text-gray-400">{customer.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <SegmentBadge segment={customer.segment} />
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-gray-500 hidden sm:table-cell">
                        {[customer.city, customer.state].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <ShoppingBag size={12} className="text-gray-400" />
                          <span className="text-[12px] font-semibold text-gray-900">{customer.orderCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-bold text-[#43A047]">₹{customer.totalSpend.toLocaleString("en-IN")}</span>
                      </td>
                      <td className="px-4 py-3.5 text-[11px] text-gray-500 hidden md:table-cell">
                        {customer.lastOrderDate
                          ? new Date(customer.lastOrderDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[11px] text-[#43A047] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          View →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedCustomer && (
        <CustomerDetailPanel customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
      )}
    </AdminLayout>
  );
}
