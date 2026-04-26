import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, Activity, Globe, Zap } from "lucide-react";
import { formatCurrency } from "../lib/helpers";
import MetricCard from "../components/MetricCard";
import DownloadReportButton from "../components/DownloadReportButton";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs space-y-1">
      <p className="text-muted-foreground font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {currency ? formatCurrency(p.value) : p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function buildDailyTimeSeries(orders, transactions) {
  const dayMap = {};
  const getDay = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  orders.forEach(o => {
    const day = getDay(o.created_date);
    if (!dayMap[day]) dayMap[day] = { day, volume: 0, orders: 0, completed: 0, escrow: 0 };
    dayMap[day].volume += o.total_amount || 0;
    dayMap[day].orders += 1;
    if (o.status === "completed") dayMap[day].completed += 1;
    if (["in_escrow", "in_transit"].includes(o.status)) dayMap[day].escrow += o.total_amount || 0;
  });

  return Object.values(dayMap).sort((a, b) => new Date(a.day) - new Date(b.day)).slice(-14);
}

function buildVelocityData(transactions) {
  const dayMap = {};
  const getDay = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  transactions.forEach(t => {
    const day = getDay(t.created_date);
    if (!dayMap[day]) dayMap[day] = { day, transfers: 0, deposits: 0, payouts: 0 };
    if (t.type === "internal_transfer") dayMap[day].transfers += 1;
    if (t.type === "deposit") dayMap[day].deposits += 1;
    if (t.type === "payout") dayMap[day].payouts += 1;
  });

  return Object.values(dayMap).sort((a, b) => new Date(a.day) - new Date(b.day)).slice(-14);
}

function buildRegionalData(orders) {
  const regions = {};
  orders.forEach(o => {
    const currency = o.currency || "UGX";
    const regionMap = { UGX: "Uganda", KES: "Kenya", TZS: "Tanzania", RWF: "Rwanda", USD: "International" };
    const region = regionMap[currency] || "Other";
    if (!regions[region]) regions[region] = { name: region, value: 0, orders: 0 };
    regions[region].value += o.total_amount || 0;
    regions[region].orders += 1;
  });
  return Object.values(regions);
}

function buildStatusFlow(orders) {
  const statuses = ["pending_deposit", "in_escrow", "in_transit", "completed", "disputed", "cancelled"];
  return statuses.map(s => ({
    name: s.replace(/_/g, " "),
    count: orders.filter(o => o.status === s).length,
  })).filter(s => s.count > 0);
}

export default function Analytics() {
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [o, t] = await Promise.all([
        base44.entities.Order.list("-created_date", 200),
        base44.entities.Transaction.list("-created_date", 200),
      ]);
      setOrders(o);
      setTransactions(t);
      setLoading(false);
    }
    load();
  }, []);

  const timeSeries = useMemo(() => buildDailyTimeSeries(orders, transactions), [orders, transactions]);
  const velocityData = useMemo(() => buildVelocityData(transactions), [transactions]);
  const regionalData = useMemo(() => buildRegionalData(orders), [orders]);
  const statusFlow = useMemo(() => buildStatusFlow(orders), [orders]);

  const totalVolume = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const completedOrders = orders.filter(o => o.status === "completed").length;
  const escrowedValue = orders.filter(o => ["in_escrow", "in_transit"].includes(o.status)).reduce((s, o) => s + (o.total_amount || 0), 0);
  const avgOrderValue = orders.length ? totalVolume / orders.length : 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-7 animate-slide-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Insights</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Time-series performance, escrow velocity & regional distribution</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <DownloadReportButton type="orders" data={orders} />
          <DownloadReportButton type="transactions" data={transactions} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Volume" value={formatCurrency(totalVolume)} subtitle={`${orders.length} orders`} icon={TrendingUp} />
        <MetricCard title="Escrowed Now" value={formatCurrency(escrowedValue)} subtitle="In-escrow + in-transit" icon={Activity} />
        <MetricCard title="Completed Orders" value={completedOrders} subtitle={`${orders.length > 0 ? Math.round((completedOrders/orders.length)*100) : 0}% completion rate`} icon={Zap} />
        <MetricCard title="Avg Order Value" value={formatCurrency(avgOrderValue)} subtitle="Per order" icon={Globe} />
      </div>

      {/* Volume time series */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold">Total Volume (14 Days)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Daily escrow volume in UGX equivalent</p>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={timeSeries}>
            <defs>
              <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="escrow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
            <Tooltip content={<CustomTooltip currency />} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Area type="monotone" dataKey="volume" name="Total Volume" stroke="#3b82f6" fill="url(#vol)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="escrow" name="In Escrow" stroke="#10b981" fill="url(#escrow)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Velocity + Status Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold">Escrow Velocity</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Daily transaction throughput by type</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={velocityData} barSize={8} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="deposits" name="Deposits" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="transfers" name="Transfers" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="payouts" name="Payouts" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold">Order Status Flow</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Current distribution across all stages</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusFlow} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Orders" radius={[0, 3, 3, 0]}>
                {statusFlow.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Regional Distribution */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold">Regional Order Distribution</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Volume and order count by currency/region</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={regionalData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3}>
                {regionalData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(val) => formatCurrency(val)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {regionalData.map((r, i) => (
              <div key={r.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-sm font-medium">{r.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{r.orders} orders</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      background: COLORS[i % COLORS.length],
                      width: `${Math.round((r.value / (regionalData.reduce((s, x) => s + x.value, 0) || 1)) * 100)}%`
                    }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">{formatCurrency(r.value)}</p>
                </div>
              </div>
            ))}
            {regionalData.length === 0 && <p className="text-sm text-muted-foreground">No regional data yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}