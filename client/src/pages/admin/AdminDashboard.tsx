/*
 * Foodondoor Admin - Dashboard
 * DB-backed: uses trpc.dashboard.stats and trpc.adminOrders.getAll
 */
import { useMemo } from "react";
import { Link } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, ShoppingBag, Package, AlertCircle, ArrowUpRight,
  Clock, CheckCircle2, Truck, ChevronRight, Loader2, CalendarCheck, AlertTriangle,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  placed:     { label: "Placed",     color: "bg-blue-50 text-blue-700",    dot: "bg-blue-500" },
  processing: { label: "Processing", color: "bg-amber-50 text-amber-700",  dot: "bg-amber-500" },
  shipped:    { label: "Shipped",    color: "bg-purple-50 text-purple-700",dot: "bg-purple-500" },
  delivered:  { label: "Delivered",  color: "bg-green-50 text-green-700",  dot: "bg-green-500" },
  cancelled:  { label: "Cancelled",  color: "bg-red-50 text-red-700",      dot: "bg-red-500" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.placed;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-600 mb-1">{label}</p>
        <p className="text-[#43A047] font-bold text-sm">₹{payload[0]?.value?.toLocaleString("en-IN")}</p>
        <p className="text-gray-400">{payload[0]?.payload?.orders} orders</p>
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: allOrdersRaw, isLoading: ordersLoading } = trpc.adminOrders.getAll.useQuery();

  const allOrders = useMemo(() => allOrdersRaw ?? [], [allOrdersRaw]);
  const recentOrders = useMemo(() => allOrders.slice(0, 8), [allOrders]);

  const statusCounts = useMemo(() => ({
    placed:     allOrders.filter(o => o.status === "placed").length,
    processing: allOrders.filter(o => o.status === "processing").length,
    shipped:    allOrders.filter(o => o.status === "shipped").length,
    delivered:  allOrders.filter(o => o.status === "delivered").length,
  }), [allOrders]);

  const ordersToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allOrders.filter(o => new Date(o.createdAt) >= today).length;
  }, [allOrders]);

  const staleOrders = useMemo(() => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);
    return allOrders.filter(o =>
      (o.status === "placed" || o.status === "processing") &&
      new Date(o.createdAt) < twoDaysAgo
    ).length;
  }, [allOrders]);

  const totalRevenue = stats?.totalRevenue ?? 0;
  const totalOrders  = stats?.totalOrders  ?? 0;
  const pendingOrders = stats?.pendingOrders ?? 0;
  const totalProducts = stats?.totalProducts ?? 0;
  const outOfStock    = stats?.outOfStockProducts ?? 0;
  const avgOrderValue = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;
  const revenueByDay  = (stats?.revenueByDay ?? []) as { date: string; revenue: number; orders: number }[];
  const topProducts   = (stats?.topProducts ?? []) as { id: number; name: string; count: number; revenue: number }[];

  const isLoading = statsLoading || ordersLoading;



  return (
    <AdminLayout
      title="Dashboard"
      subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
    >
      <div className="p-4 lg:p-6 space-y-5">

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#43A047]" size={32} />
          </div>
        ) : (
          <>


            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Revenue",    value: `₹${totalRevenue.toLocaleString("en-IN")}`, sub: "All time sales",       icon: TrendingUp, bg: "bg-[#43A047]", href: "/admin/analytics" },
                { label: "Total Orders",     value: String(totalOrders),                         sub: `${pendingOrders} pending`, icon: ShoppingBag, bg: "bg-blue-500", href: "/admin/orders" },
                { label: "Avg Order Value",  value: `₹${avgOrderValue.toLocaleString("en-IN")}`, sub: "Per order",            icon: AlertCircle, bg: "bg-orange-500", href: "/admin/analytics" },
                { label: "Products",         value: String(totalProducts),                        sub: `${outOfStock} out of stock`, icon: Package, bg: "bg-purple-500", href: "/admin/products" },
              ].map(({ label, value, sub, icon: Icon, bg, href }) => (
                <Link key={label} href={href} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
                      <Icon size={16} className="text-white" />
                    </div>
                    <ArrowUpRight size={12} className="text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 leading-none mb-1">{value}</p>
                  <p className="text-[11px] font-medium text-gray-500">{label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                </Link>
              ))}
            </div>

            {/* Order Status Pills */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Placed",     status: "placed",     count: statusCounts.placed,     icon: Clock,        color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100" },
                { label: "Processing", status: "processing", count: statusCounts.processing, icon: Package,       color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-100" },
                { label: "Shipped",    status: "shipped",    count: statusCounts.shipped,    icon: Truck,         color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
                { label: "Delivered",  status: "delivered",  count: statusCounts.delivered,  icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-50",  border: "border-green-100" },
              ].map(({ label, status, count, icon: Icon, color, bg, border }) => (
                <Link key={label} href={`/admin/orders?status=${status}`}
                  className={`flex items-center gap-3 bg-white rounded-xl border ${border} px-4 py-3 hover:shadow-sm transition-shadow`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
                    <Icon size={16} className={color} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 leading-none">{count}</p>
                    <p className="text-[11px] text-gray-500">{label}</p>
                  </div>
                  <ChevronRight size={14} className="ml-auto text-gray-300" />
                </Link>
              ))}
            </div>

            {/* Fulfillment Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50">
                  <CalendarCheck size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 leading-none">{ordersToday}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Orders Today</p>
                </div>
              </div>
              <div className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${staleOrders > 0 ? "border-amber-200" : "border-gray-200"}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${staleOrders > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
                  <AlertTriangle size={16} className={staleOrders > 0 ? "text-amber-600" : "text-gray-400"} />
                </div>
                <div>
                  <p className={`text-lg font-bold leading-none ${staleOrders > 0 ? "text-amber-600" : "text-gray-900"}`}>{staleOrders}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Stale Orders ({">"}2 days)</p>
                </div>
              </div>
            </div>

            {/* Revenue Chart + Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Area Chart */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-[13px] font-semibold text-gray-900">Revenue Overview</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">Last 7 days</p>
                  </div>
                  <span className="text-xs font-bold text-[#43A047] bg-green-50 px-2.5 py-1 rounded-full">
                    ₹{revenueByDay.reduce((s, d) => s + d.revenue, 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={revenueByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#43A047" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#43A047" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="#43A047" strokeWidth={2.5} fill="url(#revGrad)"
                      dot={{ fill: "#43A047", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#43A047" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Top Products */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[13px] font-semibold text-gray-900">Top Products</h2>
                  <Link href="/admin/products" className="text-[11px] text-[#43A047] hover:underline font-medium">View all</Link>
                </div>
                <div className="space-y-3.5">
                  {topProducts.length === 0 ? (
                    <p className="text-[12px] text-gray-400 text-center py-6">No orders yet</p>
                  ) : topProducts.map((p, i) => {
                    const pct = Math.min(100, (p.count / (topProducts[0]?.count || 1)) * 100);
                    return (
                      <div key={p.id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-500 flex-shrink-0">
                              {i + 1}
                            </span>
                            <p className="text-[11px] font-medium text-gray-700 truncate">{p.name.split("|")[0].trim()}</p>
                          </div>
                          <span className="text-[11px] font-semibold text-gray-900 ml-2 flex-shrink-0">
                            ₹{p.revenue.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1">
                            <div className="bg-[#43A047] h-1 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{p.count} sold</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Orders Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <h2 className="text-[13px] font-semibold text-gray-900">Recent Orders</h2>
                <Link href="/admin/orders" className="text-[11px] text-[#43A047] hover:underline font-medium flex items-center gap-1">
                  View all <ChevronRight size={12} />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Order</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-[12px] text-gray-400">No orders yet</td>
                      </tr>
                    ) : recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <span className="text-[12px] font-semibold text-gray-900">#{order.id}</span>
                          <p className="text-[10px] text-gray-400">{(order.items as any[]).length} item{(order.items as any[]).length !== 1 ? "s" : ""}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[12px] font-medium text-gray-800">{order.customerName}</p>
                          <p className="text-[10px] text-gray-400">{order.city}, {order.state}</p>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-gray-500 hidden md:table-cell">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[12px] font-bold text-gray-900">₹{order.total.toLocaleString("en-IN")}</span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3 text-[11px] text-gray-500 hidden lg:table-cell">{order.paymentMethod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
