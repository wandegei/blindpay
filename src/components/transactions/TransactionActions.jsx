import { supabase } from "@/lib/supabaseClient";
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TransactionActions({ tx, onRefresh }) {

  async function approve() {
    const { error } = await supabase
      .from("transactions")
      .update({
        status: "completed",
        approved_by: "admin",
        approved_at: new Date().toISOString(),
      })
      .eq("id", tx.id);

    if (error) {
      toast.error("Failed to approve transaction");
      return;
    }

    await supabase.from("audit_logs").insert({
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
    const { error } = await supabase
      .from("transactions")
      .update({
        status: "rejected",
        rejected_by: "admin",
      })
      .eq("id", tx.id);

    if (error) {
      toast.error("Failed to reject transaction");
      return;
    }

    await supabase.from("audit_logs").insert({
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
    const { error } = await supabase
      .from("transactions")
      .update({ status: "reversed" })
      .eq("id", tx.id);

    if (error) {
      toast.error("Failed to reverse transaction");
      return;
    }

    await supabase.from("audit_logs").insert({
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
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
          onClick={approve}
        >
          <CheckCircle className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-red-400 hover:text-red-300"
          onClick={reject}
        >
          <XCircle className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  if (tx.status === "completed") {
    return (
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-yellow-400 hover:text-yellow-300"
        onClick={reverse}
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </Button>
    );
  }

  return <span className="text-xs text-muted-foreground">—</span>;
}