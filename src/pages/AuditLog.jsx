import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, ScrollText } from "lucide-react";
import { Input } from "@/components/ui/input";
import StatusBadge from "../components/StatusBadge";
import { timeAgo } from "../lib/helpers";

const actionLabels = {
  order_created: "Order Created",
  deposit_received: "Deposit Received",
  transfer_initiated: "Transfer Initiated",
  transfer_approved: "Transfer Approved",
  transfer_rejected: "Transfer Rejected",
  payout_initiated: "Payout Initiated",
  payout_completed: "Payout Completed",
  order_frozen: "Order Frozen",
  order_unfrozen: "Order Unfrozen",
  wallet_frozen: "Wallet Frozen",
  wallet_unfrozen: "Wallet Unfrozen",
  transaction_reversed: "Tx Reversed",
  dispute_opened: "Dispute Opened",
  dispute_resolved: "Dispute Resolved",
  manual_override: "Manual Override",
  risk_flag_raised: "Risk Flag",
  admin_note_added: "Admin Note",
};

const actionColors = {
  order_created: "text-blue-400",
  deposit_received: "text-emerald-400",
  transfer_initiated: "text-cyan-400",
  transfer_approved: "text-emerald-400",
  transfer_rejected: "text-red-400",
  payout_completed: "text-purple-400",
  order_frozen: "text-blue-400",
  wallet_frozen: "text-blue-400",
  transaction_reversed: "text-yellow-400",
  dispute_opened: "text-red-400",
  dispute_resolved: "text-emerald-400",
  risk_flag_raised: "text-red-400",
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const data = await base44.entities.AuditLog.list("-created_date", 200);
      setLogs(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = logs.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return l.action?.toLowerCase().includes(s) ||
      l.actor_email?.toLowerCase().includes(s) ||
      l.entity_id?.toLowerCase().includes(s) ||
      l.details?.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Complete system activity trail</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search logs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-card"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Entity</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actor</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">State Change</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{timeAgo(log.created_date)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold ${actionColors[log.action] || "text-muted-foreground"}`}>
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-muted-foreground">{log.entity_type}</span>
                      <span className="text-xs font-mono text-primary ml-1">{log.entity_id?.slice(0, 8)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                          log.actor_role === "admin" ? "bg-primary/15 text-primary" :
                          log.actor_role === "system" ? "bg-secondary text-secondary-foreground" :
                          "bg-accent/15 text-accent"
                        }`}>{log.actor_role}</span>
                        <span className="text-xs text-muted-foreground">{log.actor_email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {log.previous_state && (
                        <>
                          <span className="text-muted-foreground">{log.previous_state}</span>
                          <span className="text-muted-foreground mx-1">→</span>
                          <span className="text-foreground">{log.new_state}</span>
                        </>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-xs truncate">
                      {log.details}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                      <ScrollText className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      No audit logs
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}