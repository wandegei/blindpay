import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Bell, Lock, Plus, Eye, CheckCircle, XCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, timeAgo, generateRef } from "../lib/helpers";
import { toast } from "sonner";
import CreateOrderDialog from "../components/orders/CreateOrderDialog";

export default function CustomerPortal() {
  const [orders, setOrders] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    const [o, w] = await Promise.all([
      base44.entities.Order.list("-created_date", 20),
      base44.entities.Wallet.list(),
    ]);
    setOrders(o);
    setWallets(w);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const escrow = wallets.find(w => w.provider_type === "escrow_master");
  const lockedBalance = orders
    .filter(o => !["completed", "cancelled", "refunded"].includes(o.status))
    .reduce((s, o) => s + (o.total_amount || 0), 0);

  if (selectedOrder) {
    return (
      <ApprovalScreen
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        onRefresh={load}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-0">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/20 to-transparent rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg tracking-tight">BlindPay</span>
          </div>
          <Bell className="w-5 h-5 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">Welcome, Customer</h2>
        <p className="text-muted-foreground text-sm mt-1">Locked Balance</p>
        <p className="text-3xl font-extrabold font-mono mt-1">{formatCurrency(lockedBalance)}</p>
      </div>

      {/* Create Order Button */}
      <div className="px-1 mb-4">
        <Button
          onClick={() => setShowCreate(true)}
          className="w-full h-12 text-base font-bold gap-2 bg-primary hover:bg-primary/90"
        >
          <Plus className="w-5 h-5" /> Create New Order
        </Button>
      </div>

      {/* Orders List */}
      <div className="space-y-3 px-1">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
        {orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onView={() => setSelectedOrder(order)}
          />
        ))}
        {!loading && orders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No orders yet. Create your first order.</p>
          </div>
        )}
      </div>

      {/* Privacy footer */}
      <div className="flex items-center justify-center gap-2 pt-8 pb-2 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" /> Privacy Protected
      </div>

      <CreateOrderDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
    </div>
  );
}

function OrderCard({ order, onView }) {
  const canApprove = order.status === "pending_final_approval";
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-bold text-sm">Order #{order.order_ref?.slice(-6) || order.id?.slice(0, 6)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Amount: <span className="font-mono font-semibold text-foreground">{formatCurrency(order.total_amount, order.currency)}</span>
          </p>
        </div>
        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
          order.status === "completed" ? "bg-emerald-500/20 text-emerald-400" :
          order.status === "disputed" ? "bg-red-500/20 text-red-400" :
          "bg-primary/20 text-primary"
        }`}>
          {order.status?.replace(/_/g, " ")}
        </span>
      </div>
      <div className="flex gap-2 mt-3">
        <Button size="sm" variant="outline" onClick={onView} className="flex-1 h-8 gap-1 text-xs">
          <Eye className="w-3 h-3" /> VIEW
        </Button>
        {canApprove && (
          <Button size="sm" onClick={onView} className="flex-1 h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500">
            APPROVE
          </Button>
        )}
      </div>
    </div>
  );
}

function ApprovalScreen({ order, onBack, onRefresh }) {
  const [transactions, setTransactions] = useState([]);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    base44.entities.Transaction.filter({ order_id: order.id }, "-created_date").then(setTransactions);
  }, [order.id]);

  const pendingTx = transactions.find(t => t.status === "pending_approval");

  async function approve() {
    setApproving(true);
    await base44.entities.Order.update(order.id, { status: "completed" });
    await base44.entities.AuditLog.create({
      action: "transfer_approved", entity_type: "order", entity_id: order.id,
      actor_email: "customer", actor_role: "customer",
      previous_state: order.status, new_state: "completed",
      details: JSON.stringify({ approved_by: "customer" })
    });
    toast.success("Order approved and completed!");
    setApproving(false);
    onRefresh();
    onBack();
  }

  async function reject() {
    await base44.entities.Order.update(order.id, { status: "disputed" });
    await base44.entities.AuditLog.create({
      action: "dispute_opened", entity_type: "order", entity_id: order.id,
      actor_email: "customer", actor_role: "customer",
      previous_state: order.status, new_state: "disputed",
    });
    toast.success("Order disputed.");
    onRefresh();
    onBack();
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-bold">BlindPay</span>
        </div>
        <Bell className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Order summary */}
      <div className="bg-card border border-border rounded-2xl p-6 text-center">
        <p className="text-sm text-muted-foreground mb-1">Order #{order.order_ref?.slice(-6) || order.id?.slice(0, 6)}</p>
        <p className="text-xs text-muted-foreground">Total Locked</p>
        <p className="text-3xl font-extrabold font-mono mt-1">{formatCurrency(order.total_amount, order.currency)}</p>
        <div className="mt-3">
          <span className="text-sm font-bold uppercase tracking-widest text-primary">
            Status: {order.status?.replace(/_/g, " ").toUpperCase()}
          </span>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
        <Lock className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-yellow-300">This transaction is private.</p>
          <p className="text-xs text-muted-foreground mt-0.5">Details of providers are hidden.</p>
        </div>
      </div>

      {/* Transaction details */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Transaction Chain</p>
        {transactions.slice(0, 4).map(tx => (
          <div key={tx.id} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground capitalize">{tx.type?.replace(/_/g, " ")}</span>
            <span className={`font-mono text-xs font-semibold ${
              tx.status === "completed" ? "text-emerald-400" :
              tx.status === "pending_approval" ? "text-yellow-400" : "text-muted-foreground"
            }`}>{tx.status?.replace(/_/g, " ")}</span>
          </div>
        ))}
        {transactions.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">No transactions yet</p>
        )}
      </div>

      {/* Approve/Reject */}
      {order.status === "pending_final_approval" && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={approve}
            disabled={approving}
            className="h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-500"
          >
            <CheckCircle className="w-4 h-4 mr-2" /> APPROVE
          </Button>
          <Button
            onClick={reject}
            variant="destructive"
            className="h-12 text-base font-bold"
          >
            <XCircle className="w-4 h-4 mr-2" /> REJECT
          </Button>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" /> Privacy Transaction
      </div>
    </div>
  );
}