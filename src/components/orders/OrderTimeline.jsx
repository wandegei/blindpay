import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "../StatusBadge";
import { formatCurrency, timeAgo } from "../../lib/helpers";
import { toast } from "sonner";

export default function OrderTimeline({ transactions, walletMap, orderId, onRefresh }) {
  const [rejectionReason, setRejectionReason] = useState("");

  async function approveTx(tx) {
    // Move funds: debit from_wallet locked_balance, credit to_wallet balance
    if (tx.from_wallet_id) {
      const fromW = walletMap[tx.from_wallet_id];
      if (fromW) {
        await base44.entities.Wallet.update(fromW.id, {
          locked_balance: Math.max((fromW.locked_balance || 0) - tx.amount, 0),
          total_sent: (fromW.total_sent || 0) + tx.amount,
        });
      }
    }
    if (tx.to_wallet_id) {
      const toW = walletMap[tx.to_wallet_id];
      if (toW) {
        await base44.entities.Wallet.update(toW.id, {
          balance: (toW.balance || 0) + tx.amount,
          total_received: (toW.total_received || 0) + tx.amount,
        });
      }
    }

    await base44.entities.Transaction.update(tx.id, {
      status: "completed",
      approved_by: "admin",
      approved_at: new Date().toISOString(),
    });

    // Advance order stage
    const order = (await base44.entities.Order.filter({ id: orderId }))[0];
    if (order) {
      const chain = order.provider_chain || [];
      const nextStage = (order.current_stage || 0) + 1;
      const newStatus = nextStage >= chain.length ? "pending_final_approval" : "in_transit";
      await base44.entities.Order.update(orderId, {
        current_stage: nextStage,
        status: newStatus,
      });
    }

    await base44.entities.AuditLog.create({
      action: "transfer_approved",
      entity_type: "transaction",
      entity_id: tx.id,
      actor_email: "admin",
      actor_role: "admin",
      details: JSON.stringify({ amount: tx.amount, from: tx.from_provider, to: tx.to_provider }),
      previous_state: "pending_approval",
      new_state: "completed",
    });

    toast.success("Transaction approved and funds moved");
    onRefresh();
  }

  async function rejectTx(tx) {
    await base44.entities.Transaction.update(tx.id, {
      status: "rejected",
      rejected_by: "admin",
      rejection_reason: rejectionReason || "Rejected by admin",
    });

    await base44.entities.AuditLog.create({
      action: "transfer_rejected",
      entity_type: "transaction",
      entity_id: tx.id,
      actor_email: "admin",
      actor_role: "admin",
      details: JSON.stringify({ reason: rejectionReason }),
      previous_state: "pending_approval",
      new_state: "rejected",
    });

    toast.success("Transaction rejected");
    setRejectionReason("");
    onRefresh();
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4">Transaction Timeline</h3>
      {transactions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">No transactions yet</p>
      ) : (
        <div className="space-y-4">
          {transactions.map((tx, i) => (
            <div key={tx.id} className="flex gap-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  tx.status === "completed" ? "bg-emerald-500/20 text-emerald-400" :
                  tx.status === "pending_approval" ? "bg-yellow-500/20 text-yellow-400" :
                  tx.status === "rejected" ? "bg-red-500/20 text-red-400" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {tx.status === "completed" && <CheckCircle className="w-4 h-4" />}
                  {tx.status === "pending_approval" && <Clock className="w-4 h-4" />}
                  {tx.status === "rejected" && <XCircle className="w-4 h-4" />}
                  {!["completed", "pending_approval", "rejected"].includes(tx.status) && <ArrowRight className="w-4 h-4" />}
                </div>
                {i < transactions.length - 1 && <div className="w-px flex-1 bg-border mt-2" />}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={tx.type} />
                  <StatusBadge status={tx.status} />
                  <span className="text-xs font-mono text-muted-foreground">{tx.tx_ref || tx.id?.slice(0, 8)}</span>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">
                    {tx.from_provider || "External"} → {tx.to_provider || "External"}
                  </span>
                  <span className="ml-3 font-mono font-semibold text-foreground">
                    {formatCurrency(tx.amount, tx.currency)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(tx.created_date)}</p>

                {/* Approval actions */}
                {tx.status === "pending_approval" && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Button size="sm" className="h-7 gap-1.5" onClick={() => approveTx(tx)}>
                      <CheckCircle className="w-3 h-3" /> Approve
                    </Button>
                    <Input
                      placeholder="Rejection reason..."
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      className="h-7 w-48 text-xs bg-secondary"
                    />
                    <Button size="sm" variant="destructive" className="h-7 gap-1.5" onClick={() => rejectTx(tx)}>
                      <XCircle className="w-3 h-3" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}