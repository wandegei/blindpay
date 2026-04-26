import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, CheckCircle, Lock, Unlock, Send } from "lucide-react";
import RiskAssessment from "./RiskAssessment";
import { Button } from "@/components/ui/button";
import StatusBadge from "../StatusBadge";
import { formatCurrency, timeAgo, generateRef } from "../../lib/helpers";
import { calculateFees } from "../../lib/feeEngine";
import { toast } from "sonner";
import OrderTimeline from "./OrderTimeline";
import FeeBreakdown from "../FeeBreakdown";

export default function OrderDetail({ order, onBack, onRefresh }) {
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [txRes, walletRes, logRes, orderRes] = await Promise.all([
        supabase.from("transactions").select("*").eq("order_id", order.id).order("created_date", { ascending: false }),
        supabase.from("wallets").select("*"),
        supabase.from("audit_logs").select("*").eq("entity_id", order.id).order("created_date", { ascending: false }),
        supabase.from("orders").select("*").order("created_date", { ascending: false }).limit(100),
      ]);

      if (txRes.error || walletRes.error || logRes.error || orderRes.error) {
        toast.error("Failed to load order data");
        setLoading(false);
        return;
      }

      setTransactions(txRes.data || []);
      setWallets(walletRes.data || []);
      setAuditLogs(logRes.data || []);
      setAllOrders(orderRes.data || []);
      setLoading(false);
    }

    load();
  }, [order.id]);

  const walletMap = {};
  wallets.forEach(w => { walletMap[w.id] = w; });

  async function simulateDeposit() {
    const escrowWallet = wallets.find(w => w.provider_type === "escrow_master");
    if (!escrowWallet) {
      toast.error("No escrow master wallet found");
      return;
    }

    const txRef = generateRef("DEP");

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .insert([{
        tx_ref: txRef,
        order_id: order.id,
        type: "deposit",
        to_wallet_id: escrowWallet.id,
        to_provider: escrowWallet.provider_name,
        amount: order.total_amount,
        currency: order.currency,
        status: "completed",
        stage_index: 0,
      }])
      .select()
      .single();

    if (txError) return toast.error("Deposit failed");

    await supabase.from("wallets").update({
      locked_balance: (escrowWallet.locked_balance || 0) + order.total_amount,
      total_received: (escrowWallet.total_received || 0) + order.total_amount,
    }).eq("id", escrowWallet.id);

    await supabase.from("orders").update({
      status: "in_escrow",
      deposit_reference: txRef,
    }).eq("id", order.id);

    await supabase.from("audit_logs").insert([{
      action: "deposit_received",
      entity_type: "order",
      entity_id: order.id,
      actor_email: "system",
      actor_role: "system",
      details: { amount: order.total_amount, tx_id: tx.id },
      previous_state: order.status,
      new_state: "in_escrow",
    }]);

    toast.success("Deposit simulated");
    onRefresh();
  }

  async function initiateNextTransfer() {
    const chain = order.provider_chain || [];
    const stage = order.current_stage || 0;

    if (stage >= chain.length) {
      toast.error("All stages complete");
      return;
    }

    const escrowWallet = wallets.find(w => w.provider_type === "escrow_master");
    const fromWallet = stage === 0 ? escrowWallet : walletMap[chain[stage - 1]];
    const toWallet = walletMap[chain[stage]];

    if (!fromWallet || !toWallet) {
      toast.error("Wallet not found");
      return;
    }

    const { netAmount, totalFee } = calculateFees(order.total_amount);

    const { error } = await supabase.from("transactions").insert([{
      tx_ref: generateRef("TRF"),
      order_id: order.id,
      type: "internal_transfer",
      from_wallet_id: fromWallet.id,
      to_wallet_id: toWallet.id,
      from_provider: fromWallet.provider_name,
      to_provider: toWallet.provider_name,
      amount: netAmount,
      currency: order.currency,
      status: "pending_approval",
      stage_index: stage,
      approval_required_from: "admin",
      notes: `Fee deducted: ${formatCurrency(totalFee, order.currency)}`,
    }]);

    if (error) return toast.error("Transfer failed");

    await supabase.from("orders").update({ status: "in_transit" }).eq("id", order.id);

    await supabase.from("audit_logs").insert([{
      action: "transfer_initiated",
      entity_type: "order",
      entity_id: order.id,
      actor_email: "admin",
      actor_role: "admin",
      details: { stage, from: fromWallet.provider_name, to: toWallet.provider_name },
      previous_state: order.status,
      new_state: "in_transit",
    }]);

    toast.success(`Transfer to ${toWallet.provider_name} initiated`);
    onRefresh();
  }

  async function toggleFreeze() {
    const newFrozen = !order.frozen;

    await supabase.from("orders")
      .update({ frozen: newFrozen })
      .eq("id", order.id);

    await supabase.from("audit_logs").insert([{
      action: newFrozen ? "order_frozen" : "order_unfrozen",
      entity_type: "order",
      entity_id: order.id,
      actor_email: "admin",
      actor_role: "admin",
      details: { reason: newFrozen ? "Admin freeze" : "Admin unfreeze" },
    }]);

    toast.success(newFrozen ? "Order frozen" : "Order unfrozen");
    onRefresh();
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-mono">
              {order.order_ref || order.id?.slice(0, 12)}
            </h1>
            <StatusBadge status={order.status} />
            {order.frozen && (
              <span className="text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded">
                FROZEN
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {order.customer_name} · {formatCurrency(order.total_amount, order.currency)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {order.status === "pending_deposit" && (
          <Button onClick={simulateDeposit} size="sm">
            <CheckCircle className="w-3.5 h-3.5" /> Simulate Deposit
          </Button>
        )}

        {["in_escrow", "in_transit"].includes(order.status) && (
          <>
            <Button onClick={initiateNextTransfer} size="sm">
              <Send className="w-3.5 h-3.5" /> Next Transfer
            </Button>
            <FeeBreakdown amount={order.total_amount} currency={order.currency} />
          </>
        )}

        <Button onClick={toggleFreeze} size="sm" variant="outline">
          {order.frozen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          {order.frozen ? "Unfreeze" : "Freeze"}
        </Button>
      </div>

      <OrderTimeline
        transactions={transactions}
        walletMap={walletMap}
        orderId={order.id}
        onRefresh={onRefresh}
      />

      <RiskAssessment
        order={order}
        transactions={transactions}
        auditLogs={auditLogs}
        allOrders={allOrders}
        onRefresh={onRefresh}
      />
    </div>
  );
}