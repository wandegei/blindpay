import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Shield, AlertTriangle, Activity, Zap, Wallet } from "lucide-react";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
import { formatCurrency, timeAgo } from "../lib/helpers";

export default function AdminPanel() {
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [
          { data: o },
          { data: t },
          { data: w },
          { data: d },
          { data: l },
        ] = await Promise.all([
          supabase.from("orders").select("*").order("created_date", { ascending: false }).limit(100),
          supabase.from("transactions").select("*").order("created_date", { ascending: false }).limit(100),
          supabase.from("wallets").select("*"),
          supabase.from("disputes").select("*").order("created_date", { ascending: false }).limit(50),
          supabase.from("audit_logs").select("*").order("created_date", { ascending: false }).limit(20),
        ]);

        setOrders(o || []);
        setTransactions(t || []);
        setWallets(w || []);
        setDisputes(d || []);
        setLogs(l || []);
      } catch (err) {
        console.error("Error loading admin data:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const frozenOrders = orders.filter(o => o.frozen);
  const stuckOrders = orders.filter(o =>
    ["in_transit", "pending_final_approval"].includes(o.status) &&
    new Date() - new Date(o.updated_date) > 24 * 60 * 60 * 1000
  );

  const highRiskOrders = orders.filter(o => (o.risk_score || 0) > 60);
  const pendingApprovals = transactions.filter(t => t.status === "pending_approval");
  const frozenWallets = wallets.filter(w => w.status === "frozen");

  const totalSystemFunds = wallets.reduce(
    (s, w) => s + (w.balance || 0) + (w.locked_balance || 0),
    0
  );

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Control Center</h1>
          <p className="text-sm text-muted-foreground">
            Full system oversight and intervention tools
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total System Funds" value={formatCurrency(totalSystemFunds)} icon={Wallet} />
        <MetricCard title="Pending Approvals" value={pendingApprovals.length} icon={Activity} />
        <MetricCard title="Stuck Orders" value={stuckOrders.length} subtitle="No activity > 24h" icon={AlertTriangle} />
        <MetricCard title="High Risk Orders" value={highRiskOrders.length} icon={Zap} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Alerts */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" /> Active Alerts
          </h2>

          <div className="space-y-2">
            {frozenOrders.length > 0 && <AlertRow type="info" message={`${frozenOrders.length} frozen order(s)`} />}
            {frozenWallets.length > 0 && <AlertRow type="info" message={`${frozenWallets.length} frozen wallet(s)`} />}
            {stuckOrders.length > 0 && <AlertRow type="warning" message={`${stuckOrders.length} stuck order(s)`} />}
            {highRiskOrders.length > 0 && <AlertRow type="danger" message={`${highRiskOrders.length} high-risk order(s)`} />}
            {pendingApprovals.length > 0 && <AlertRow type="warning" message={`${pendingApprovals.length} pending approval(s)`} />}
            {disputes.filter(d => d.status === "open").length > 0 && (
              <AlertRow type="danger" message={`${disputes.filter(d => d.status === "open").length} open dispute(s)`} />
            )}

            {frozenOrders.length === 0 &&
             stuckOrders.length === 0 &&
             highRiskOrders.length === 0 &&
             pendingApprovals.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No active alerts — system healthy
              </p>
            )}
          </div>
        </div>

        {/* Admin logs */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Recent Admin Actions</h2>

          <div className="space-y-2">
            {logs
              .filter(l => l.actor_role === "admin")
              .slice(0, 8)
              .map(l => (
                <div key={l.id} className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground w-16">
                    {timeAgo(l.created_date)}
                  </span>
                  <span className="flex-1">
                    {l.action?.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono text-primary">
                    {l.entity_id?.slice(0, 6)}
                  </span>
                </div>
              ))}

            {logs.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No recent actions
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Pending approvals */}
      {pendingApprovals.length > 0 && (
        <div className="bg-card border border-yellow-500/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-yellow-400" /> Pending Approvals
          </h2>

          <div className="space-y-2">
            {pendingApprovals.map(tx => (
              <div key={tx.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                <StatusBadge status={tx.type} />
                <span className="text-xs font-mono text-primary">
                  {tx.tx_ref || tx.id?.slice(0, 8)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {tx.from_provider || "External"} → {tx.to_provider || "External"}
                </span>
                <span className="text-xs font-mono font-semibold ml-auto">
                  {formatCurrency(tx.amount, tx.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AlertRow({ type, message }) {
  const colors = {
    info: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    danger: "bg-red-500/10 border-red-500/20 text-red-400",
  };

  return (
    <div className={`px-3 py-2 rounded-lg border text-xs font-medium ${colors[type]}`}>
      {message}
    </div>
  );
}