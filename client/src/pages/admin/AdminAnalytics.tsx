/*
 * Foodondoor Admin - Analytics Page
 * DB-backed: order analytics + page view traffic analytics with date range filter
 */

import { useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { TrendingUp, ShoppingBag, Users, Repeat, Loader2, Eye, Globe, Monitor, Smartphone, ArrowUp, ArrowDown, MapPin, CreditCard, Filter, MessageCircle, IndianRupee, Calendar, Truck, UserPlus, Star } from "lucide-react";

const COLORS = ["#43A047", "#1E88E5", "#FF6D00", "#8E24AA", "#F4511E", "#00897B", "#FFB300", "#E53935"];

/** Format paise amount as Indian rupees: ₹1,23,456 */
const fmtRupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-600 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-bold">
            {p.name === "revenue" ? `₹${p.value?.toLocaleString("en-IN")}` : p.name === "views" ? `${p.value} views` : p.name === "uniqueVisitors" ? `${p.value} visitors` : `${p.value} orders`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const SEGMENT_COLORS: Record<string, string> = {
  "VIP": "#FFB300",
  "Active": "#43A047",
  "First-Timer": "#1E88E5",
  "New": "#9E9E9E",
  "At-Risk": "#FF6D00",
  "Dormant": "#E53935",
  "Churned": "#B71C1C",
};

function CustomerSegmentsSection() {
  const { data: segmentSummary, isLoading } = trpc.analytics.segmentSummary.useQuery();

  const chartData = useMemo(() => {
    if (!segmentSummary || segmentSummary.length === 0) return [];
    return (segmentSummary as { segment: string; count: number; totalRevenue: number }[])
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .map(s => ({ name: s.segment, value: s.count, revenue: s.totalRevenue }));
  }, [segmentSummary]);

  const totalCustomers = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users size={14} className="text-gray-600" />
        <h2 className="text-[13px] font-semibold text-gray-900">Customer Segments</h2>
        {totalCustomers > 0 && (
          <span className="text-[11px] text-gray-400 ml-auto">{totalCustomers} total</span>
        )}
      </div>
      {isLoading ? (
        <div className="h-[160px] flex items-center justify-center">
          <Loader2 size={20} className="text-gray-300 animate-spin" />
        </div>
      ) : chartData.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                paddingAngle={2} dataKey="value">
                {chartData.map((d) => (
                  <Cell key={d.name} fill={SEGMENT_COLORS[d.name] || "#9E9E9E"} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, name: string) => [v, name]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col justify-center gap-1.5">
            {chartData.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: SEGMENT_COLORS[d.name] || "#9E9E9E" }} />
                <span className="text-[11px] text-gray-600 flex-1">{d.name}</span>
                <span className="text-[11px] font-semibold text-gray-900">{d.value}</span>
                {d.name === "VIP" && <Star size={10} className="text-amber-500 fill-amber-500" />}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-[160px] flex items-center justify-center text-[12px] text-gray-400">
          No customer data yet
        </div>
      )}
    </div>
  );
}

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState(7);
  const [funnelDays, setFunnelDays] = useState(7);

  // CEO Revenue Dashboard
  const { data: ceo, isLoading: ceoLoading } = trpc.analytics.ceoDashboard.useQuery();

  // Fetch all orders from DB via tRPC
  const { data: orders = [], isLoading: ordersLoading } = trpc.adminOrders.getAll.useQuery();

  // Fetch traffic analytics
  const { data: trafficStats, isLoading: trafficLoading } = trpc.analytics.getStats.useQuery({ days: dateRange });
  const { data: dailyViews = [], isLoading: dailyLoading } = trpc.analytics.getDailyViews.useQuery({ days: dateRange });

  // Fetch cart funnel analytics
  const { data: funnelData = [] } = trpc.analytics.cartFunnel.useQuery({ days: funnelDays });
  const { data: abandonedCarts = [] } = trpc.analytics.abandonedCarts.useQuery({ limit: 20 });

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o: any) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1), value,
    }));
  }, [orders]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    orders.forEach((o: any) => {
      const items = typeof o.items === "string" ? JSON.parse(o.items) : (o.items || []);
      items.forEach((item: any) => {
        const n = (item.name || "").toLowerCase();
        const cat = n.includes("cashew") ? "Cashews" : n.includes("almond") ? "Almonds" :
          n.includes("pistachio") || n.includes("pista") ? "Pistachios" :
          n.includes("date") || n.includes("khajur") ? "Dates" :
          n.includes("raisin") || n.includes("kishmish") ? "Raisins" :
          n.includes("chia") ? "Chia Seeds" : n.includes("makhana") ? "Makhana" : "Others";
        data[cat] = (data[cat] || 0) + (item.price || 0) * (item.quantity || 1);
      });
    });
    return Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const weeklyRevenue = useMemo(() => {
    const weeks = [];
    for (let w = 3; w >= 0; w--) {
      const start = new Date(); start.setDate(start.getDate() - (w + 1) * 7);
      const end = new Date(); end.setDate(end.getDate() - w * 7);
      const weekOrders = orders.filter((o: any) => {
        const d = new Date(o.createdAt);
        return d >= start && d < end && o.status !== "cancelled";
      });
      weeks.push({
        week: `Week ${4 - w}`,
        revenue: weekOrders.reduce((s: number, o: any) => s + (o.total || 0), 0),
        orders: weekOrders.length,
      });
    }
    return weeks;
  }, [orders]);

  const totalRevenue = useMemo(() =>
    orders.filter((o: any) => o.status !== "cancelled").reduce((s: number, o: any) => s + (o.total || 0), 0),
    [orders]
  );

  const monthlyRevenue = weeklyRevenue.reduce((s, w) => s + w.revenue, 0);
  const avgOrderValue = orders.length ? Math.round(totalRevenue / orders.length) : 0;

  const uniqueCustomers = useMemo(() => {
    const phones = new Set(orders.map((o: any) => o.phone).filter(Boolean));
    return phones.size;
  }, [orders]);

  const repeatRate = useMemo(() => {
    const phoneCounts: Record<string, number> = {};
    orders.forEach((o: any) => { if (o.phone) phoneCounts[o.phone] = (phoneCounts[o.phone] || 0) + 1; });
    const repeaters = Object.values(phoneCounts).filter(c => c > 1).length;
    const total = Object.keys(phoneCounts).length;
    return total > 0 ? Math.round((repeaters / total) * 100) : 0;
  }, [orders]);

  // Month-over-Month Revenue Comparison
  const momComparison = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const thisMonthRev = orders
      .filter((o: any) => new Date(o.createdAt) >= thisMonthStart && o.status !== "cancelled")
      .reduce((s: number, o: any) => s + (o.total || 0), 0);

    const lastMonthRev = orders
      .filter((o: any) => {
        const d = new Date(o.createdAt);
        return d >= lastMonthStart && d <= lastMonthEnd && o.status !== "cancelled";
      })
      .reduce((s: number, o: any) => s + (o.total || 0), 0);

    const change = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : thisMonthRev > 0 ? 100 : 0;
    return { thisMonthRev, lastMonthRev, change };
  }, [orders]);

  // Payment Method Breakdown
  const paymentMethodData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o: any) => {
      const method = (o.paymentMethod || "unknown").toLowerCase();
      const label = method === "cod" ? "COD" : method === "razorpay" ? "Razorpay" : method === "phonepe" ? "PhonePe" : method.charAt(0).toUpperCase() + method.slice(1);
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // Customer Acquisition Trend (New vs Returning) — last 6 months
  const acquisitionTrend = useMemo(() => {
    const now = new Date();
    const months: { label: string; newCust: number; returning: number }[] = [];
    const seenPhones = new Set<string>();

    // Build month boundaries for last 6 months
    const monthBuckets: { label: string; start: Date; end: Date }[] = [];
    for (let m = 5; m >= 0; m--) {
      const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const end = m === 0 ? now : new Date(now.getFullYear(), now.getMonth() - m + 1, 0, 23, 59, 59);
      monthBuckets.push({
        label: start.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        start,
        end,
      });
    }

    // Sort orders by date ascending to properly track first-time customers
    const sorted = [...orders].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Track phones seen before the 6-month window
    const windowStart = monthBuckets[0]?.start ?? now;
    sorted.forEach((o: any) => {
      if (new Date(o.createdAt) < windowStart && o.phone) {
        seenPhones.add(o.phone);
      }
    });

    for (const bucket of monthBuckets) {
      const monthOrders = sorted.filter((o: any) => {
        const d = new Date(o.createdAt);
        return d >= bucket.start && d <= bucket.end;
      });

      const newSet = new Set<string>();
      const retSet = new Set<string>();

      monthOrders.forEach((o: any) => {
        if (!o.phone) return;
        if (seenPhones.has(o.phone)) {
          retSet.add(o.phone);
        } else {
          newSet.add(o.phone);
        }
      });

      // After processing the month, add all phones to seenPhones
      monthOrders.forEach((o: any) => {
        if (o.phone) seenPhones.add(o.phone);
      });

      months.push({ label: bucket.label, newCust: newSet.size, returning: retSet.size });
    }

    return months;
  }, [orders]);

  // Top Cities by order count
  const topCities = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o: any) => {
      const city = (o.city || "").trim();
      if (city) counts[city] = (counts[city] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [orders]);

  const isLoading = ordersLoading || trafficLoading || ceoLoading;

  if (isLoading) {
    return (
      <AdminLayout title="Analytics" subtitle="Store performance overview">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Analytics" subtitle="Store performance overview">
      <div className="p-4 lg:p-6 space-y-5">

        {/* ═══════════ CEO REVENUE DASHBOARD ═══════════ */}
        {ceo && (
          <>
            <div className="border-b border-gray-200 pb-3">
              <h2 className="text-base font-bold text-gray-900">CEO Revenue Dashboard</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Real-time business overview</p>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Today Revenue", value: fmtRupees(ceo.todayRevenue), sub: `${ceo.todayOrders} orders`, icon: IndianRupee, color: "bg-[#43A047]" },
                { label: "MTD Revenue", value: fmtRupees(ceo.mtdRevenue), sub: `${ceo.mtdOrders} orders`, icon: Calendar, color: "bg-blue-500" },
                { label: "Pending COD", value: fmtRupees(ceo.pendingCODAmount), sub: `Collected: ${fmtRupees(ceo.collectedCODAmount)}`, icon: Truck, color: "bg-orange-500" },
                { label: "Today Orders", value: String(ceo.todayOrders), sub: `MTD: ${ceo.mtdOrders}`, icon: ShoppingBag, color: "bg-purple-500" },
              ].map(({ label, value, sub, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} mb-3`}>
                    <Icon size={15} className="text-white" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 leading-none mb-1">{value}</p>
                  <p className="text-[11px] text-gray-500">{label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Revenue Trend (30 days) + Revenue by Payment Method */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Daily Revenue Trend */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                <div className="mb-4">
                  <h2 className="text-[13px] font-semibold text-gray-900">Daily Revenue Trend</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">Last 30 days</p>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={ceo.dailyRevenueTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ceoRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#43A047" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#43A047" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => { const d = new Date(v); return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); }}
                      interval={Math.max(0, Math.floor(ceo.dailyRevenueTrend.length / 8))} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `₹${Math.round(v / 100).toLocaleString("en-IN")}`} />
                    <Tooltip
                      formatter={(v: number, name: string) => [name === "revenue" ? fmtRupees(v) : v, name === "revenue" ? "Revenue" : "Orders"]}
                      labelFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "11px" }} />
                    <Area type="monotone" dataKey="revenue" name="revenue" stroke="#43A047" strokeWidth={2}
                      fill="url(#ceoRevGrad)" dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="orderCount" name="orders" stroke="#1E88E5" strokeWidth={1.5}
                      dot={false} yAxisId={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue by Payment Method */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-[13px] font-semibold text-gray-900 mb-4">Revenue by Payment Method</h2>
                {ceo.revenueByPaymentMethod.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={ceo.revenueByPaymentMethod.map(d => ({ name: d.method, value: d.revenue }))}
                        cx="50%" cy="45%" innerRadius={45} outerRadius={70}
                        paddingAngle={3} dataKey="value"
                      >
                        {ceo.revenueByPaymentMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => fmtRupees(v)}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "11px" }} />
                      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "10px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-[12px] text-gray-400">No data yet</div>
                )}
              </div>
            </div>

            {/* Top 5 Products + New vs Repeat Customers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Top 5 Products */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                <div className="mb-4">
                  <h2 className="text-[13px] font-semibold text-gray-900">Top 5 Products by Revenue</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">Month to date</p>
                </div>
                {ceo.top5Products.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={ceo.top5Products.map(p => ({ name: p.name.length > 25 ? p.name.slice(0, 25) + "..." : p.name, revenue: p.revenue, quantity: p.quantity }))}
                      layout="vertical" barSize={18} margin={{ left: 10, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => `₹${Math.round(v / 100).toLocaleString("en-IN")}`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false}
                        tickLine={false} width={130} />
                      <Tooltip
                        formatter={(v: number, name: string) => [name === "revenue" ? fmtRupees(v) : v, name === "revenue" ? "Revenue" : "Qty"]}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "11px" }} />
                      <Bar dataKey="revenue" name="revenue" radius={[0, 6, 6, 0]}>
                        {ceo.top5Products.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-[12px] text-gray-400">No sales data yet</div>
                )}
              </div>

              {/* New vs Repeat Customers */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-[13px] font-semibold text-gray-900 mb-4">Customers (MTD)</h2>
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex-1 text-center">
                    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
                      <UserPlus size={20} className="text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{ceo.newCustomers}</p>
                    <p className="text-[11px] text-gray-500">New</p>
                  </div>
                  <div className="w-px h-16 bg-gray-200" />
                  <div className="flex-1 text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-2">
                      <Repeat size={20} className="text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{ceo.repeatCustomers}</p>
                    <p className="text-[11px] text-gray-500">Repeat</p>
                  </div>
                </div>
                {(ceo.newCustomers + ceo.repeatCustomers) > 0 && (
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>New {Math.round((ceo.newCustomers / (ceo.newCustomers + ceo.repeatCustomers)) * 100)}%</span>
                      <span>Repeat {Math.round((ceo.repeatCustomers / (ceo.newCustomers + ceo.repeatCustomers)) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-green-500 rounded-l-full" style={{ width: `${(ceo.newCustomers / (ceo.newCustomers + ceo.repeatCustomers)) * 100}%` }} />
                      <div className="h-full bg-blue-500 rounded-r-full" style={{ width: `${(ceo.repeatCustomers / (ceo.newCustomers + ceo.repeatCustomers)) * 100}%` }} />
                    </div>
                  </div>
                )}

                {/* COD Summary */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <h3 className="text-[11px] font-semibold text-gray-700 mb-2">COD Summary</h3>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Pending COD</span>
                      <span className="font-semibold text-orange-600">{fmtRupees(ceo.pendingCODAmount)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Collected COD</span>
                      <span className="font-semibold text-green-600">{fmtRupees(ceo.collectedCODAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider before existing sections */}
            <div className="border-t border-gray-200" />
          </>
        )}

        {/* Date Range Filter */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Site Traffic</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {[
              { label: "7 Days", value: 7 },
              { label: "30 Days", value: 30 },
              { label: "90 Days", value: 90 },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setDateRange(value)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                  dateRange === value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Traffic KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Page Views", value: String(trafficStats?.totalViews || 0), icon: Eye, color: "bg-blue-500" },
            { label: "Unique Visitors", value: String(trafficStats?.uniqueSessions || 0), icon: Users, color: "bg-purple-500" },
            { label: "Top Pages", value: String(trafficStats?.topPages?.length || 0), icon: Globe, color: "bg-green-500" },
            { label: "Referrers", value: String(trafficStats?.referrers?.length || 0), icon: TrendingUp, color: "bg-orange-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} mb-3`}>
                <Icon size={15} className="text-white" />
              </div>
              <p className="text-xl font-bold text-gray-900 leading-none mb-1">{value}</p>
              <p className="text-[11px] text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Daily Traffic Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[13px] font-semibold text-gray-900">Daily Traffic</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Page views & unique visitors (last {dateRange} days)</p>
            </div>
          </div>
          {dailyViews.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyViews} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="views" name="views" stroke="#1E88E5" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="uniqueVisitors" name="uniqueVisitors" stroke="#43A047" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-[12px] text-gray-400">
              No traffic data yet. Visits will appear here once customers browse the site.
            </div>
          )}
        </div>

        {/* Traffic Details: Top Pages + Referrers + Devices */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Pages */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-[13px] font-semibold text-gray-900 mb-3">Top Pages</h2>
            {trafficStats?.topPages && trafficStats.topPages.length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {trafficStats.topPages.slice(0, 10).map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-600 truncate max-w-[180px]">{p.path || "/"}</span>
                    <span className="font-semibold text-gray-900">{p.views}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400">No data yet</p>
            )}
          </div>

          {/* Referrers */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-[13px] font-semibold text-gray-900 mb-3">Referrers</h2>
            {trafficStats?.referrers && trafficStats.referrers.length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {trafficStats.referrers.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-600 truncate max-w-[180px]">{r.referrer || "Direct"}</span>
                    <span className="font-semibold text-gray-900">{r.views}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400">No data yet</p>
            )}
          </div>

          {/* Devices */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-[13px] font-semibold text-gray-900 mb-3">Devices</h2>
            {trafficStats?.devices && trafficStats.devices.length > 0 ? (
              <div className="space-y-3">
                {trafficStats.devices.map((d: any, i: number) => {
                  const total = trafficStats.totalViews || 1;
                  const pct = Math.round((d.views / total) * 100);
                  const Icon = d.device === "mobile" ? Smartphone : Monitor;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="flex items-center gap-1.5 text-gray-600">
                          <Icon size={12} />
                          {(d.device || "unknown").charAt(0).toUpperCase() + (d.device || "unknown").slice(1)}
                        </span>
                        <span className="font-semibold text-gray-900">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#43A047] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400">No data yet</p>
            )}
          </div>
        </div>

        {/* Browsers + Countries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Browsers */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-[13px] font-semibold text-gray-900 mb-3">Browsers</h2>
            {trafficStats?.browsers && trafficStats.browsers.length > 0 ? (
              <div className="space-y-2">
                {trafficStats.browsers.map((b: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-600">{b.browser || "Unknown"}</span>
                    <span className="font-semibold text-gray-900">{b.views} views</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400">No data yet</p>
            )}
          </div>

          {/* Countries */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-[13px] font-semibold text-gray-900 mb-3">Regions</h2>
            {trafficStats?.countries && trafficStats.countries.length > 0 ? (
              <div className="space-y-2">
                {trafficStats.countries.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-600">{c.country || "Unknown"}</span>
                    <span className="font-semibold text-gray-900">{c.views} views</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400">No data yet</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 pt-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Order Analytics</h2>
        </div>

        {/* Order KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Avg. Order Value", value: `₹${avgOrderValue.toLocaleString("en-IN")}`, icon: TrendingUp, color: "bg-[#43A047]" },
            { label: "Total Orders", value: String(orders.length), icon: ShoppingBag, color: "bg-blue-500" },
            { label: "Unique Customers", value: String(uniqueCustomers), icon: Users, color: "bg-purple-500" },
            { label: "Repeat Rate", value: `${repeatRate}%`, icon: Repeat, color: "bg-orange-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} mb-3`}>
                <Icon size={15} className="text-white" />
              </div>
              <p className="text-xl font-bold text-gray-900 leading-none mb-1">{value}</p>
              <p className="text-[11px] text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Revenue Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[11px] text-gray-500 mb-1">Total Revenue (All Time)</p>
            <p className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[11px] text-gray-500 mb-1">Last 4 Weeks Revenue</p>
            <p className="text-2xl font-bold text-gray-900">₹{monthlyRevenue.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Month-over-Month Revenue Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[11px] text-gray-500 mb-1">This Month</p>
            <p className="text-2xl font-bold text-gray-900">{"₹"}{momComparison.thisMonthRev.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[11px] text-gray-500 mb-1">Last Month</p>
            <p className="text-2xl font-bold text-gray-900">{"₹"}{momComparison.lastMonthRev.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${momComparison.change >= 0 ? "bg-green-50" : "bg-red-50"}`}>
              {momComparison.change >= 0 ? (
                <ArrowUp size={18} className="text-green-600" />
              ) : (
                <ArrowDown size={18} className="text-red-600" />
              )}
            </div>
            <div>
              <p className={`text-xl font-bold ${momComparison.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {momComparison.change >= 0 ? "+" : ""}{momComparison.change}%
              </p>
              <p className="text-[11px] text-gray-500">Month-over-Month</p>
            </div>
          </div>
        </div>

        {/* Weekly Revenue + Status Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[13px] font-semibold text-gray-900">Weekly Revenue</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Last 4 weeks</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyRevenue} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weekGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#43A047" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#43A047" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="revenue" stroke="#43A047" strokeWidth={2.5}
                  fill="url(#weekGrad)" dot={{ fill: "#43A047", r: 4, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-[13px] font-semibold text-gray-900 mb-4">Order Status</h2>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="45%" innerRadius={50} outerRadius={75}
                    paddingAngle={3} dataKey="value">
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "11px" }} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-[12px] text-gray-400">
                No order data yet
              </div>
            )}
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={15} className="text-gray-500" />
            <h2 className="text-[13px] font-semibold text-gray-900">Payment Methods</h2>
          </div>
          {paymentMethodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={paymentMethodData} cx="50%" cy="45%" innerRadius={50} outerRadius={75}
                  paddingAngle={3} dataKey="value">
                  {paymentMethodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "11px" }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-[12px] text-gray-400">
              No payment data yet
            </div>
          )}
        </div>

        {/* Customer Acquisition Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-4">
            <h2 className="text-[13px] font-semibold text-gray-900">Customer Acquisition</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">New vs returning customers (last 6 months)</p>
          </div>
          {acquisitionTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={acquisitionTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "11px" }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "10px" }} />
                <Bar dataKey="newCust" name="New Customers" stackId="a" fill="#1E88E5" radius={[0, 0, 0, 0]} />
                <Bar dataKey="returning" name="Returning" stackId="a" fill="#43A047" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-[12px] text-gray-400">
              No customer data yet
            </div>
          )}
        </div>

        {/* Top Cities */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={15} className="text-gray-500" />
            <h2 className="text-[13px] font-semibold text-gray-900">Top Cities by Orders</h2>
          </div>
          {topCities.length > 0 ? (
            <div className="space-y-2.5">
              {topCities.map((city, i) => {
                const pct = Math.min(100, (city.count / (topCities[0]?.count || 1)) * 100);
                return (
                  <div key={city.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-500 flex-shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-[11px] font-medium text-gray-700 truncate">{city.name}</p>
                      </div>
                      <span className="text-[11px] font-semibold text-gray-900 ml-2 flex-shrink-0">
                        {city.count} orders
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1">
                        <div className="bg-[#1E88E5] h-1 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400">No city data yet</p>
          )}
        </div>

        {/* Category Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-4">
            <h2 className="text-[13px] font-semibold text-gray-900">Revenue by Category</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Based on ordered items (from DB)</p>
          </div>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categoryData} layout="vertical" barSize={16} margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false}
                  tickLine={false} width={75} />
                <Tooltip
                  formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "11px" }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-[12px] text-gray-400">
              No sales data yet
            </div>
          )}
        </div>

        {/* ── Cart Abandonment Funnel ── */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">Cart Funnel</h2>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {[
                { label: "7 Days", value: 7 },
                { label: "30 Days", value: 30 },
                { label: "90 Days", value: 90 },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setFunnelDays(value)}
                  className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                    funnelDays === value
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Funnel Visualization */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-[13px] font-semibold text-gray-900 mb-4">Checkout Funnel</h3>
          {funnelData.length > 0 ? (() => {
            const STEP_LABELS: Record<string, string> = {
              add_to_cart: "Added to Cart",
              view_cart: "Viewed Cart",
              start_checkout: "Started Checkout",
              enter_address: "Entered Address",
              select_payment: "Selected Payment",
              order_placed: "Ordered",
            };
            const maxSessions = Math.max(...funnelData.map(s => s.sessions), 1);
            return (
              <div className="space-y-2">
                {funnelData.map((step, i) => {
                  const prevSessions = i > 0 ? funnelData[i - 1].sessions : step.sessions;
                  const dropOff = prevSessions > 0 ? Math.round(((prevSessions - step.sessions) / prevSessions) * 100) : 0;
                  const widthPct = Math.max((step.sessions / maxSessions) * 100, 4);
                  return (
                    <div key={step.step}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-gray-600 font-medium">{STEP_LABELS[step.step] || step.step}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900">{step.sessions}</span>
                          {i > 0 && dropOff > 0 && (
                            <span className="text-red-500 text-[10px]">-{dropOff}%</span>
                          )}
                        </div>
                      </div>
                      <div className="h-6 bg-gray-100 rounded-md overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all duration-500"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: i === funnelData.length - 1 ? '#43A047' : `hsl(${142 - i * 15}, 60%, ${45 + i * 5}%)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })() : (
            <div className="h-[200px] flex items-center justify-center text-[12px] text-gray-400">
              No funnel data yet. Events will appear once customers interact with the cart.
            </div>
          )}
        </div>

        {/* Abandoned Carts Table */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-[13px] font-semibold text-gray-900 mb-4">Recent Abandoned Carts (Last 7 Days)</h3>
          {abandonedCarts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Session</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Customer</th>
                    <th className="text-right py-2 px-2 text-gray-500 font-medium">Cart Value</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Last Step</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Time</th>
                    <th className="text-center py-2 px-2 text-gray-500 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {abandonedCarts.map((cart) => {
                    const STEP_SHORT: Record<string, string> = {
                      add_to_cart: "Added to Cart",
                      view_cart: "Viewed Cart",
                      start_checkout: "Started Checkout",
                      enter_address: "Entered Address",
                      select_payment: "Selected Payment",
                    };
                    return (
                      <tr key={cart.sessionId} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 px-2 text-gray-600 font-mono">
                          {cart.sessionId.slice(0, 8)}...
                        </td>
                        <td className="py-2 px-2 text-gray-700">
                          {cart.customerName || (cart.customerPhone ? cart.customerPhone : <span className="text-gray-400">Anonymous</span>)}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-gray-900">
                          {cart.cartValue > 0 ? `₹${Math.round(cart.cartValue / 100).toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="py-2 px-2">
                          <span className="inline-block bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-[10px] font-medium">
                            {STEP_SHORT[cart.lastEvent] || cart.lastEvent}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-gray-500">
                          {new Date(cart.lastActivity).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {cart.customerPhone ? (
                            <a
                              href={`https://wa.me/91${cart.customerPhone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent("Hi! We noticed you left some items in your cart at Foodondoor. Can we help you complete your order?")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 hover:text-green-800 bg-green-50 px-2 py-1 rounded"
                            >
                              <MessageCircle size={10} /> WhatsApp
                            </a>
                          ) : (
                            <span className="text-gray-300 text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[100px] flex items-center justify-center text-[12px] text-gray-400">
              No abandoned carts in the last 7 days.
            </div>
          )}
        </div>

        {/* Customer Segments */}
        <CustomerSegmentsSection />

      </div>
    </AdminLayout>
  );
}
