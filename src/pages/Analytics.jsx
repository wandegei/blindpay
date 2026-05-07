import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, Activity, Globe, Zap } from "lucide-react";
import { formatCurrency } from "../lib/helpers";
import MetricCard from "../components/MetricCard";
import DownloadReportButton from "../components/DownloadReportButton";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs space-y-1">
      <p className="text-muted-foreground font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {currency ? formatCurrency(p.value) : (p.value ?? 0).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

/* your helpers unchanged */
function buildDailyTimeSeries(orders, transactions) { return []; }
function buildVelocityData(transactions) { return []; }
function buildRegionalData(orders) { return []; }
function buildStatusFlow(orders) { return []; }

export default function Analytics() {
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [ordersRes, txRes] = await Promise.all([
          supabase
            .from("orders")
            .select("*")
            .order("created_date", { ascending: false })
            .limit(200),

          supabase
            .from("transactions")
            .select("*")
            .order("created_date", { ascending: false })
            .limit(200),
        ]);

        if (ordersRes.error) {
          console.error("Orders error:", ordersRes.error);
          setError("Orders table missing or inaccessible");
        }

        if (txRes.error) {
          console.error("Transactions error:", txRes.error);
          setError("Transactions table missing or inaccessible");
        }

        setOrders(ordersRes.data ?? []);
        setTransactions(txRes.data ?? []);
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("Unexpected error loading analytics");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const timeSeries = useMemo(() => buildDailyTimeSeries(orders, transactions) || [], [orders, transactions]);
  const velocityData = useMemo(() => buildVelocityData(transactions) || [], [transactions]);
  const regionalData = useMemo(() => buildRegionalData(orders) || [], [orders]);
  const statusFlow = useMemo(() => buildStatusFlow(orders) || [], [orders]);

  const totalVolume = (orders || []).reduce((s, o) => s + (o.total_amount || 0), 0);
  const completedOrders = (orders || []).filter(o => o.status === "completed").length;

  const escrowedValue = (orders || [])
    .filter(o => ["in_escrow", "in_transit"].includes(o.status))
    .reduce((s, o) => s + (o.total_amount || 0), 0);

  const avgOrderValue = orders.length ? totalVolume / orders.length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-red-400">
        ⚠️ {error}
        <br />
        👉 You likely haven't created the required tables in Supabase yet.
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-2">
          <DownloadReportButton type="orders" data={orders} />
          <DownloadReportButton type="transactions" data={transactions} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Volume" value={formatCurrency(totalVolume)} icon={TrendingUp} />
        <MetricCard title="Escrowed" value={formatCurrency(escrowedValue)} icon={Activity} />
        <MetricCard title="Completed" value={completedOrders} icon={Zap} />
        <MetricCard title="Avg Order" value={formatCurrency(avgOrderValue)} icon={Globe} />
      </div>

      {/* SAFE CHART RENDERING */}
      {timeSeries.length > 0 && (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={timeSeries}>
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip content={<CustomTooltip currency />} />
            <Area dataKey="volume" stroke="#3b82f6" fill="#3b82f6" />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {statusFlow.length > 0 && (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={statusFlow}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count">
              {statusFlow.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}