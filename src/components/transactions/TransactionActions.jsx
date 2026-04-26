import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TransactionActions({ tx, onRefresh }) {
  async function approve() {
    await base44.entities.Transaction.update(tx.id, {
      status: "completed",
      approved_by: "admin",
      approved_at: new Date().toISOString(),
    });
    await base44.entities.AuditLog.create({
      action: "transfer_approved",
      entity_type: "transaction",
      entity_id: tx.id,
      actor_email: "admin",
      actor_role: "admin",
      previous_state: tx.status,
      new_state: "completed",
    });
    toast.success("Transaction approved");
    onRefresh();
  }

  async function reject() {
    await base44.entities.Transaction.update(tx.id, {
      status: "rejected",
      rejected_by: "admin",
    });
    await base44.entities.AuditLog.create({
      action: "transfer_rejected",
      entity_type: "transaction",
      entity_id: tx.id,
      actor_email: "admin",
      actor_role: "admin",
      previous_state: tx.status,
      new_state: "rejected",
    });
    toast.success("Transaction rejected");
    onRefresh();
  }

  async function reverse() {
    await base44.entities.Transaction.update(tx.id, { status: "reversed" });
    await base44.entities.AuditLog.create({
      action: "transaction_reversed",
      entity_type: "transaction",
      entity_id: tx.id,
      actor_email: "admin",
      actor_role: "admin",
      previous_state: tx.status,
      new_state: "reversed",
    });
    toast.success("Transaction reversed");
    onRefresh();
  }

  if (tx.status === "pending_approval") {
    return (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400 hover:text-emerald-300" onClick={approve}>
          <CheckCircle className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={reject}>
          <XCircle className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  if (tx.status === "completed") {
    return (
      <Button size="icon" variant="ghost" className="h-7 w-7 text-yellow-400 hover:text-yellow-300" onClick={reverse}>
        <RotateCcw className="w-3.5 h-3.5" />
      </Button>
    );
  }

  return <span className="text-xs text-muted-foreground">—</span>;
}