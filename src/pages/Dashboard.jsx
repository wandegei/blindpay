import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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
      const [o, t, w, d] = await Promise.all([
        base44.entities.Order.list("-created_date", 50),
        base44.entities.Transaction.list("-created_date", 50),
        base44.entities.Wallet.list("-created_date", 50),
        base44.entities.Dispute.list("-created_date", 20),
      ]);
      setOrders(o);
      setTransactions(t);
      setWallets(w);
      setDisputes(d);
      setLoading(false);
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

  const activeOrders = orders.filter(o => !["completed", "cancelled", "refunded"].includes(o.status));
  const pendingApprovals = transactions.filter(t => t.status === "pending_approval");
  const totalEscrow = wallets.reduce((sum, w) => sum + (w.locked_balance || 0), 0);
  const totalAvailable = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const openDisputes = disputes.filter(d => ["open", "under_review", "escalated"].includes(d.status));

  return (
    <div className="space-y-7 animate-slide-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Overview</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">BlindPay escrow system — real-time monitoring</p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400">All Systems Operational</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Orders"
          value={activeOrders.length}
          subtitle={`${orders.length} total orders`}
          icon={FileText}
        />
        <MetricCard
          title="Pending Approvals"
          value={pendingApprovals.length}
          subtitle="Require immediate action"
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
          subtitle={`${disputes.length} total disputes`}
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

      {/* Pending Approvals Alert */}
      {pendingApprovals.length > 0 && (
        <div className="bg-yellow-500/8 border border-yellow-500/25 rounded-xl px-5 py-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-300">{pendingApprovals.length} transaction{pendingApprovals.length > 1 ? "s" : ""} awaiting approval</p>
            <p className="text-xs text-muted-foreground mt-0.5">Review and approve or reject pending transfers</p>
          </div>
          <Link to="/transactions" className="flex items-center gap-1 text-xs font-semibold text-yellow-400 hover:text-yellow-300 transition-colors flex-shrink-0">
            Review <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Recent Orders Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Recent Orders</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Latest activity across all orders</p>
          </div>
          <Link to="/orders" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/30 border-b border-border">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reference</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Risk</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {orders.slice(0, 8).map((order) => (
                <tr key={order.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-3.5">
                    <Link to={`/orders?id=${order.id}`} className="font-mono text-xs text-primary hover:underline font-medium">
                      {order.order_ref || order.id?.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-6 py-3.5 text-sm font-medium text-foreground">{order.customer_name}</td>
                  <td className="px-6 py-3.5 font-mono text-sm font-semibold">{formatCurrency(order.total_amount, order.currency)}</td>
                  <td className="px-6 py-3.5"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (order.risk_score || 0) > 70 ? "bg-red-500" :
                            (order.risk_score || 0) > 40 ? "bg-yellow-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${order.risk_score || 0}%` }}
                        />
                      </div>
                      <span className={`text-xs font-mono font-bold ${
                        (order.risk_score || 0) > 70 ? "text-red-400" :
                        (order.risk_score || 0) > 40 ? "text-yellow-400" : "text-emerald-400"
                      }`}>{order.risk_score || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-xs text-muted-foreground">{timeAgo(order.created_date)}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p>No orders yet. Create your first order to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}