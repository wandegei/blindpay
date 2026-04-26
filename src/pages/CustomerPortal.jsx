import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, Bell, Lock, Plus, Eye, CheckCircle, XCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "../lib/helpers";
import { toast } from "sonner";
import CreateOrderDialog from "../components/orders/CreateOrderDialog";

export default function CustomerPortal() {
  const [orders, setOrders] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    try {
      const [
        { data: o },
        { data: w }
      ] = await Promise.all([
        supabase.from("orders").select("*").order("created_date", { ascending: false }).limit(20),
        supabase.from("wallets").select("*")
      ]);

      setOrders(o || []);
      setWallets(w || []);
    } catch (err) {
      console.error("Error loading customer data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

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
            <span className="font-bold text-lg">BlindPay</span>
          </div>
          <Bell className="w-5 h-5 text-muted-foreground" />
        </div>

        <h2 className="text-xl font-bold">Welcome, Customer</h2>
        <p className="text-muted-foreground text-sm mt-1">Locked Balance</p>
        <p className="text-3xl font-extrabold font-mono mt-1">
          {formatCurrency(lockedBalance)}
        </p>
      </div>

      {/* Create Order */}
      <div className="px-1 mb-4">
        <Button onClick={() => setShowCreate(true)} className="w-full h-12 font-bold">
          <Plus className="w-5 h-5" /> Create New Order
        </Button>
      </div>

      {/* Orders */}
      <div className="space-y-3 px-1">
        {loading && <Loader />}
        {orders.map(order => (
          <OrderCard key={order.id} order={order} onView={() => setSelectedOrder(order)} />
        ))}
      </div>

      <div className="flex justify-center text-xs text-muted-foreground pt-6">
        <Lock className="w-3 h-3 mr-1" /> Privacy Protected
      </div>

      <CreateOrderDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
    </div>
  );
}

/* ---------------- APPROVAL SCREEN ---------------- */

function ApprovalScreen({ order, onBack, onRefresh }) {
  const [transactions, setTransactions] = useState([]);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    async function loadTx() {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("order_id", order.id)
        .order("created_date", { ascending: false });

      setTransactions(data || []);
    }
    loadTx();
  }, [order.id]);

  async function approve() {
    setApproving(true);

    await supabase.from("orders")
      .update({ status: "completed" })
      .eq("id", order.id);

    await supabase.from("audit_logs").insert([{
      action: "transfer_approved",
      entity_type: "order",
      entity_id: order.id,
      actor_email: "customer",
      actor_role: "customer",
      previous_state: order.status,
      new_state: "completed",
      details: { approved_by: "customer" }
    }]);

    toast.success("Order approved!");
    setApproving(false);
    onRefresh();
    onBack();
  }

  async function reject() {
    await supabase.from("orders")
      .update({ status: "disputed" })
      .eq("id", order.id);

    await supabase.from("audit_logs").insert([{
      action: "dispute_opened",
      entity_type: "order",
      entity_id: order.id,
      actor_email: "customer",
      actor_role: "customer",
      previous_state: order.status,
      new_state: "disputed"
    }]);

    toast.success("Order disputed.");
    onRefresh();
    onBack();
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <button onClick={onBack}>← Back</button>

      <div className="bg-card p-6 text-center rounded-xl">
        <p>Order #{order.id?.slice(0, 6)}</p>
        <p className="text-2xl">{formatCurrency(order.total_amount)}</p>
      </div>

      {transactions.map(tx => (
        <div key={tx.id}>{tx.type} — {tx.status}</div>
      ))}

      {order.status === "pending_final_approval" && (
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={approve} disabled={approving}>Approve</Button>
          <Button onClick={reject} variant="destructive">Reject</Button>
        </div>
      )}
    </div>
  );
}

/* ---------------- SMALL COMPONENTS ---------------- */

function OrderCard({ order, onView }) {
  return (
    <div className="border p-3 rounded-lg">
      <p>Order #{order.id?.slice(0, 6)}</p>
      <p>{formatCurrency(order.total_amount)}</p>
      <Button onClick={onView}>View</Button>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex justify-center py-6">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}