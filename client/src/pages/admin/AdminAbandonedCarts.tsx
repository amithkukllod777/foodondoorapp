/**
 * Foodondoor Admin - Abandoned Carts
 * DB-backed: uses trpc.abandonedCarts.getAll / markRecovered / delete
 */
import { useMemo, useState } from "react";
import { ShoppingCart, Search, RefreshCw, TrendingUp, Users, DollarSign, AlertTriangle, ChevronDown, ChevronUp, X, Download, Loader2, MapPin, Bell } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";

function timeAgo(ts: number | string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(ts: number | string): string {
  return new Date(ts).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminAbandonedCarts() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "abandoned" | "recovered">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"updatedAt" | "total" | "itemCount">("updatedAt");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const utils = trpc.useUtils();
  const { data: carts = [], isLoading, refetch } = trpc.abandonedCarts.getAll.useQuery();
  const markRecoveredMut = trpc.abandonedCarts.markRecovered.useMutation({
    onSuccess: () => utils.abandonedCarts.getAll.invalidate(),
  });
  const deleteMut = trpc.abandonedCarts.delete.useMutation({
    onSuccess: () => utils.abandonedCarts.getAll.invalidate(),
  });
  const remindMut = trpc.abandonedCarts.sendReminder.useMutation({
    onSuccess: (r) => {
      const ch = [r.whatsapp && "WhatsApp", r.email && "email"].filter(Boolean).join(" + ");
      toast.success(ch ? `Reminder sent via ${ch}` : "Reminder queued");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const filteredCarts = useMemo(() => {
    let list = [...carts] as any[];
    if (filter !== "all") list = list.filter(c => c.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.phone && c.phone.includes(q)) ||
        (c.name && c.name.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      let va: number, vb: number;
      if (sortBy === "updatedAt") {
        va = new Date(a.updatedAt).getTime();
        vb = new Date(b.updatedAt).getTime();
      } else if (sortBy === "total") {
        va = a.total; vb = b.total;
      } else {
        va = (a.items as any[]).length; vb = (b.items as any[]).length;
      }
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return list;
  }, [carts, filter, search, sortBy, sortDir]);

  const totalAbandoned = carts.filter((c: any) => c.status === "abandoned").length;
  const totalRecovered = carts.filter((c: any) => c.status === "recovered").length;
  const totalValue = carts.filter((c: any) => c.status === "abandoned").reduce((s: number, c: any) => s + c.total, 0);
  const recoveryRate = carts.length > 0 ? Math.round((totalRecovered / carts.length) * 100) : 0;

  const exportCSV = () => {
    const rows = [
      ["Customer", "Phone", "Source", "Location", "Items", "Products", "Total Value", "Last Activity", "Status"],
      ...filteredCarts.map((c: any) => [
        c.name || "Guest",
        c.phone || "—",
        c.source || "—",
        c.location || c.city || "—",
        (c.items as any[]).length.toString(),
        (c.items as any[]).map((i: any) => `${i.name} x${i.quantity}`).join("; "),
        `₹${c.total}`,
        formatDate(c.updatedAt),
        c.status,
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `abandoned-carts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return <ChevronDown size={12} className="text-gray-300" />;
    return sortDir === "desc" ? <ChevronDown size={12} className="text-[#43A047]" /> : <ChevronUp size={12} className="text-[#43A047]" />;
  };

  return (
    <AdminLayout
      title="Abandoned Carts"
      subtitle={`${totalAbandoned} active`}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 transition-colors">
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs text-white bg-[#43A047] hover:bg-[#2e7d32] rounded-lg px-3 py-1.5 transition-colors">
            <Download size={13} /> Export CSV
          </button>
        </div>
      }
    >
      <div className="p-4 lg:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Abandoned Carts", value: totalAbandoned, icon: ShoppingCart, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
            { label: "Total Value at Risk", value: `₹${totalValue.toLocaleString("en-IN")}`, icon: DollarSign, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
            { label: "Recovered", value: totalRecovered, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
            { label: "Recovery Rate", value: `${recoveryRate}%`, icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`bg-white rounded-xl border ${border} p-4 flex items-center gap-3`}>
              <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by mobile or name..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#43A047]" />
            </div>
            <div className="flex gap-2">
              {(["all", "abandoned", "recovered"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg capitalize transition-colors ${
                    filter === f ? "bg-[#43A047] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>{f}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 size={28} className="mx-auto text-gray-300 mb-3 animate-spin" />
              <p className="text-sm text-gray-400">Loading abandoned carts...</p>
            </div>
          ) : filteredCarts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart size={28} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No abandoned carts found</p>
              <p className="text-gray-400 text-sm mt-1">
                {carts.length === 0 ? "Carts will appear here when users add items but don't checkout" : "Try adjusting your search or filter"}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <span>Customer</span>
                <button onClick={() => handleSort("itemCount")} className="flex items-center gap-1 hover:text-gray-800">Items <SortIcon col="itemCount" /></button>
                <button onClick={() => handleSort("total")} className="flex items-center gap-1 hover:text-gray-800">Cart Value <SortIcon col="total" /></button>
                <button onClick={() => handleSort("updatedAt")} className="flex items-center gap-1 hover:text-gray-800">Last Activity <SortIcon col="updatedAt" /></button>
                <span>Status</span>
                <span>Actions</span>
              </div>

              <div className="divide-y divide-gray-50">
                {filteredCarts.map((cart: any) => (
                  <div key={cart.id}>
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === cart.id ? null : cart.id)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {cart.phone ? cart.phone.slice(-2) : "G"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-gray-800">{cart.name || (cart.phone ? `+91 ${cart.phone}` : "Guest User")}</p>
                            {cart.source && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${cart.source === "app" ? "bg-indigo-100 text-indigo-700" : "bg-sky-100 text-sky-700"}`}>
                                {cart.source}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {cart.phone && cart.name && <p className="text-xs text-gray-400">+91 {cart.phone}</p>}
                            {(cart.location || cart.city) && <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-500"><MapPin size={10} /> {cart.location || cart.city}</span>}
                            {cart.email && <span className="text-[11px] text-gray-400 truncate max-w-[140px]">{cart.email}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-700 md:block hidden">{(cart.items as any[]).length} item{(cart.items as any[]).length !== 1 ? "s" : ""}</span>
                        <span className="text-xs text-gray-500 md:hidden">{(cart.items as any[]).length} items · ₹{cart.total.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="hidden md:flex items-center">
                        <span className="text-sm font-semibold text-gray-800">₹{cart.total.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="hidden md:flex items-center">
                        <div>
                          <p className="text-xs font-medium text-gray-700">{timeAgo(cart.updatedAt)}</p>
                          <p className="text-[10px] text-gray-400">{formatDate(cart.updatedAt)}</p>
                        </div>
                      </div>
                      <div className="hidden md:flex items-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${cart.status === "recovered" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {cart.status === "recovered" ? "Recovered" : "Abandoned"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {cart.status === "abandoned" && (cart.phone || cart.email) && (
                          <button onClick={() => remindMut.mutate({ id: cart.id })} disabled={remindMut.isPending}
                            title="Send WhatsApp + email reminder"
                            className="inline-flex items-center gap-1 text-xs text-[#43A047] hover:text-white hover:bg-[#43A047] border border-[#43A047] rounded-lg px-2 py-1 transition-colors disabled:opacity-50">
                            <Bell size={12} /> Remind
                          </button>
                        )}
                        {cart.status === "abandoned" && (
                          <button onClick={() => markRecoveredMut.mutate({ phone: cart.phone })}
                            className="text-xs text-green-600 hover:text-green-800 border border-green-200 hover:border-green-400 rounded-lg px-2 py-1 transition-colors">
                            Recovered
                          </button>
                        )}
                        <button onClick={() => deleteMut.mutate({ id: cart.id })}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                          <X size={14} />
                        </button>
                        <button onClick={() => setExpandedId(expandedId === cart.id ? null : cart.id)}
                          className="p-1.5 text-gray-300 hover:text-gray-600 transition-colors">
                          {expandedId === cart.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {expandedId === cart.id && (
                      <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pt-3">Cart Items</p>
                        <div className="space-y-2">
                          {(cart.items as any[]).map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border border-gray-100">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <ShoppingCart size={14} className="text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                                <p className="text-xs text-gray-400">Qty: {item.quantity} × ₹{item.price?.toLocaleString("en-IN")}</p>
                              </div>
                              <p className="text-sm font-semibold text-gray-800 flex-shrink-0">
                                ₹{((item.price ?? 0) * (item.quantity ?? 1)).toLocaleString("en-IN")}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end mt-3 pt-3 border-t border-gray-200">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Cart Total</p>
                            <p className="text-base font-bold text-gray-900">₹{cart.total.toLocaleString("en-IN")}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-400">Showing {filteredCarts.length} of {carts.length} records</p>
                <p className="text-xs text-gray-400">Total abandoned value: <span className="font-semibold text-gray-700">₹{totalValue.toLocaleString("en-IN")}</span></p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">How abandoned carts are tracked</p>
            <p className="text-xs text-blue-600 mt-1">
              When a user adds items to cart and does not complete checkout, their cart is saved to the database.
              Logged-in users are identified by phone number; guest users appear as "Guest User".
              Data is synced in real-time from the database.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
