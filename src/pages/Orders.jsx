import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "../components/StatusBadge";
import { formatCurrency, timeAgo } from "../lib/helpers";
import CreateOrderDialog from "../components/orders/CreateOrderDialog";
import OrderDetail from "../components/orders/OrderDetail";
import DownloadReportButton from "../components/DownloadReportButton";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const urlId = urlParams.get("id");

  useEffect(() => {
    if (urlId) setSelectedId(urlId);
  }, [urlId]);

  async function loadOrders() {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_date", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error loading orders:", error);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filtered = orders.filter(o => {
    const matchSearch =
      !search ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.order_ref?.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      filterStatus === "all" || o.status === filterStatus;

    return matchSearch && matchStatus;
  });

  const selectedOrder = orders.find(o => o.id === selectedId);

  if (selectedOrder) {
    return (
      <OrderDetail
        order={selectedOrder}
        onBack={() => setSelectedId(null)}
        onRefresh={loadOrders}
      />
    );
  }

  const statuses = [
    "all",
    "pending_deposit",
    "deposit_received",
    "in_escrow",
    "in_transit",
    "pending_final_approval",
    "completed",
    "cancelled",
    "disputed",
  ];

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {orders.length} total orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadReportButton type="orders" data={filtered} />
          <Button
            onClick={() => setShowCreate(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> New Order
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterStatus === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {s === "all" ? "All" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Reference</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Stage</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedId(order.id)}
                    className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-primary">
                      {order.order_ref || order.id?.slice(0, 8)}
                    </td>
                    <td className="px-5 py-3">{order.customer_name}</td>
                    <td className="px-5 py-3 font-mono">
                      {formatCurrency(order.total_amount, order.currency)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {(order.current_stage || 0) + 1}/
                      {(order.provider_chain || []).length || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-mono ${
                          (order.risk_score || 0) > 70
                            ? "text-red-400"
                            : (order.risk_score || 0) > 40
                            ? "text-yellow-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {order.risk_score || 0}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {timeAgo(order.created_date)}
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-muted-foreground"
                    >
                      {search || filterStatus !== "all"
                        ? "No orders match your filters."
                        : "No orders yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateOrderDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadOrders}
      />
    </div>
  );
}