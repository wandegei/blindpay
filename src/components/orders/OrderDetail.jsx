import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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
      const [txs, ws, logs, orders] = await Promise.all([
        base44.entities.Transaction.filter({ order_id: order.id }, "-created_date"),
        base44.entities.Wallet.list(),
        base44.entities.AuditLog.filter({ entity_id: order.id }, "-created_date"),
        base44.entities.Order.list("-created_date", 100),
      ]);
      setTransactions(txs);
      setWallets(ws);
      setAuditLogs(logs);
      setAllOrders(orders);
      setLoading(false);
    }
    load();
  }, [order.id]);

  const walletMap = {};
  wallets.forEach(w => { walletMap[w.id] = w; });

  async function simulateDeposit() {
    const escrowWallet = wallets.find(w => w.provider_type === "escrow_master");
    if (!escrowWallet) {
      toast.error("No escrow master wallet found. Create one first.");
      return;
    }

    const tx = await base44.entities.Transaction.create({
      tx_ref: generateRef("DEP"),
      order_id: order.id,
      type: "deposit",
      to_wallet_id: escrowWallet.id,
      to_provider: escrowWallet.provider_name,
      amount: order.total_amount,
      currency: order.currency,
      status: "completed",
      stage_index: 0,
    });

    await base44.entities.Wallet.update(escrowWallet.id, {
      locked_balance: (escrowWallet.locked_balance || 0) + order.total_amount,
      total_received: (escrowWallet.total_received || 0) + order.total_amount,
    });

    await base44.entities.Order.update(order.id, {
      status: "in_escrow",
      deposit_reference: tx.tx_ref,
    });

    await base44.entities.AuditLog.create({
      action: "deposit_received",
      entity_type: "order",
      entity_id: order.id,
      actor_email: "system",
      actor_role: "system",
      details: JSON.stringify({ amount: order.total_amount, tx_id: tx.id }),
      previous_state: order.status,
      new_state: "in_escrow",
    });

    toast.success("Deposit simulated and locked in escrow");
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
      toast.error("Wallet not found for this stage");
      return;
    }

    const { netAmount, totalFee } = calculateFees(order.total_amount);

    await base44.entities.Transaction.create({
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
    });

    await base44.entities.Order.update(order.id, { status: "in_transit" });

    await base44.entities.AuditLog.create({
      action: "transfer_initiated",
      entity_type: "order",
      entity_id: order.id,
      actor_email: "admin",
      actor_role: "admin",
      details: JSON.stringify({ stage, from: fromWallet.provider_name, to: toWallet.provider_name }),
      previous_state: order.status,
      new_state: "in_transit",
    });

    toast.success(`Transfer to ${toWallet.provider_name} initiated — pending approval`);
    onRefresh();
  }

  async function toggleFreeze() {
    const newFrozen = !order.frozen;
    await base44.entities.Order.update(order.id, { frozen: newFrozen });
    await base44.entities.AuditLog.create({
      action: newFrozen ? "order_frozen" : "order_unfrozen",
      entity_type: "order",
      entity_id: order.id,
      actor_email: "admin",
      actor_role: "admin",
      details: JSON.stringify({ reason: newFrozen ? "Admin freeze" : "Admin unfreeze" }),
    });
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
            <h1 className="text-xl font-bold tracking-tight font-mono">{order.order_ref || order.id?.slice(0, 12)}</h1>
            <StatusBadge status={order.status} />
            {order.frozen && (
              <span className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">FROZEN</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{order.customer_name} · {formatCurrency(order.total_amount, order.currency)}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {order.status === "pending_deposit" && (
          <Button onClick={simulateDeposit} size="sm" className="gap-2">
            <CheckCircle className="w-3.5 h-3.5" /> Simulate Deposit
          </Button>
        )}
        {["in_escrow", "in_transit"].includes(order.status) && (
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Button onClick={initiateNextTransfer} size="sm" className="gap-2">
              <Send className="w-3.5 h-3.5" /> Initiate Next Transfer
            </Button>
            <FeeBreakdown amount={order.total_amount} currency={order.currency} />
          </div>
        )}
        <Button onClick={toggleFreeze} size="sm" variant="outline" className="gap-2">
          {order.frozen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          {order.frozen ? "Unfreeze" : "Freeze"}
        </Button>
      </div>

      {/* Order Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold">Order Details</h3>
          <div className="space-y-2 text-sm">
            <Row label="Customer" value={order.customer_name} />
            <Row label="Email" value={order.customer_email || "—"} />
            <Row label="Phone" value={order.customer_phone || "—"} />
            <Row label="Amount" value={formatCurrency(order.total_amount, order.currency)} mono />
            <Row label="Deposit Method" value={order.deposit_method?.replace(/_/g, " ")} />
            <Row label="Risk Score" value={order.risk_score || 0} />
            <Row label="Created" value={timeAgo(order.created_date)} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold">Provider Chain</h3>
          {(order.provider_chain || []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No providers in chain</p>
          ) : (
            <div className="space-y-2">
              {(order.provider_chain || []).map((pid, i) => {
                const w = walletMap[pid];
                const isCurrent = i === (order.current_stage || 0);
                return (
                  <div key={pid} className={`flex items-center gap-3 p-2 rounded-lg ${isCurrent ? "bg-primary/10 border border-primary/20" : "bg-secondary/50"}`}>
                    <span className="text-xs font-mono text-muted-foreground w-6">{i + 1}.</span>
                    <span className="text-sm font-medium">{w?.provider_name || pid.slice(0, 8)}</span>
                    {isCurrent && <span className="text-[10px] text-primary font-semibold ml-auto">CURRENT</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Risk Assessment */}
      <RiskAssessment
        order={order}
        transactions={transactions}
        auditLogs={auditLogs}
        allOrders={allOrders}
        onRefresh={onRefresh}
      />

      {/* Transaction timeline */}
      <OrderTimeline transactions={transactions} walletMap={walletMap} orderId={order.id} onRefresh={onRefresh} />
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}