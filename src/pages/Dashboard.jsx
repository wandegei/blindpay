import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { 
  FileText, Wallet, AlertTriangle, Clock, ArrowRight, ShieldCheck
} from "lucide-react";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
import { formatCurrency, timeAgo } from "../lib/helpers";
import RecentActivityFeed from "../components/dashboard/RecentActivityFeed";
import PipelineOverview from "../components/dashboard/PipelineOverview";

export default function Dashboard() {
  const { isLoadingAuth, authError } = useAuth();

  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoadingAuth || authError) return;

    async function load() {
      try {
        const [
          { data: o },
          { data: t },
          { data: w },
          { data: d }
        ] = await Promise.all([
          supabase.from("orders").select("*").order("created_date", { ascending: false }).limit(50),
          supabase.from("transactions").select("*").order("created_date", { ascending: false }).limit(50),
          supabase.from("wallets").select("*").order("created_date", { ascending: false }).limit(50),
          supabase.from("disputes").select("*").order("created_date", { ascending: false }).limit(20),
        ]);

        setOrders(o || []);
        setTransactions(t || []);
        setWallets(w || []);
        setDisputes(d || []);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isLoadingAuth, authError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  /* ---------- Derived Data ---------- */

  const activeOrders = orders.filter(o =>
    !["completed", "cancelled", "refunded"].includes(o.status)
  );

  const pendingApprovals = transactions.filter(t =>
    t.status === "pending_approval"
  );

  const totalEscrow = wallets.reduce(
    (sum, w) => sum + (w.locked_balance || 0),
    0
  );

  const totalAvailable = wallets.reduce(
    (sum, w) => sum + (w.balance || 0),
    0
  );

  const openDisputes = disputes.filter(d =>
    ["open", "under_review", "escalated"].includes(d.status)
  );

  /* ---------- UI ---------- */

  return (
    <div className="space-y-7 animate-slide-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            Overview
          </p>
          <h1 className="text-3xl font-extrabold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            BlindPay escrow system — real-time monitoring
          </p>
        </div>

        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400">
            All Systems Operational
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Orders"
          value={activeOrders.length}
          subtitle={`${orders.length} total`}
          icon={FileText}
        />
        <MetricCard
          title="Pending Approvals"
          value={pendingApprovals.length}
          subtitle="Needs action"
          icon={Clock}
        />
        <MetricCard
          title="Total in Escrow"
          value={formatCurrency(totalEscrow)}
          subtitle={`${formatCurrency(totalAvailable)} available`}
          icon={Wallet}
        />
        <MetricCard
          title="Open Disputes"
          value={openDisputes.length}
          subtitle={`${disputes.length} total`}
          icon={AlertTriangle}
        />
      </div>

      {/* Pipeline + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PipelineOverview orders={orders} />
        </div>
        <div>
          <RecentActivityFeed transactions={transactions} />
        </div>
      </div>

      {/* Pending Alert */}
      {pendingApprovals.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-5 py-4 flex items-center gap-4">
          <Clock className="w-4 h-4 text-yellow-400" />
          <p className="text-sm font-semibold text-yellow-300">
            {pendingApprovals.length} pending approval(s)
          </p>
          <Link to="/transactions" className="ml-auto text-xs text-yellow-400">
            Review <ArrowRight className="w-3 h-3 inline" />
          </Link>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between">
          <h2 className="text-sm font-semibold">Recent Orders</h2>
          <Link to="/orders" className="text-xs text-primary">
            View all →
          </Link>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left">Ref</th>
              <th className="px-6 py-3 text-left">Customer</th>
              <th className="px-6 py-3 text-left">Amount</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Risk</th>
              <th className="px-6 py-3 text-left">Created</th>
            </tr>
          </thead>

          <tbody>
            {orders.slice(0, 8).map(order => (
              <tr key={order.id}>
                <td className="px-6 py-3 font-mono text-xs">
                  {order.order_ref || order.id?.slice(0, 8)}
                </td>
                <td className="px-6 py-3">{order.customer_name}</td>
                <td className="px-6 py-3">
                  {formatCurrency(order.total_amount)}
                </td>
                <td className="px-6 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-6 py-3">
                  {order.risk_score || 0}
                </td>
                <td className="px-6 py-3 text-xs">
                  {timeAgo(order.created_date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}