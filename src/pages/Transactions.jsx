import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import StatusBadge from "../components/StatusBadge";
import { formatCurrency, timeAgo } from "../lib/helpers";
import TransactionActions from "../components/transactions/TransactionActions";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_date", { ascending: false })
      .limit(100);

    if (error) {
      console.error(error);
    } else {
      setTransactions(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = transactions.filter((tx) => {
    const matchSearch =
      !search ||
      tx.tx_ref?.toLowerCase().includes(search.toLowerCase()) ||
      tx.from_provider?.toLowerCase().includes(search.toLowerCase()) ||
      tx.to_provider?.toLowerCase().includes(search.toLowerCase());

    const matchType = filterType === "all" || tx.type === filterType;
    const matchStatus = filterStatus === "all" || tx.status === filterStatus;

    return matchSearch && matchType && matchStatus;
  });

  const types = ["all", "deposit", "internal_transfer", "payout", "refund", "reversal"];
  const statuses = ["all", "pending_approval", "approved", "executing", "completed", "rejected", "failed", "reversed"];

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {transactions.length} total transactions
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {t === "all" ? "All Types" : t.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterStatus === s
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {s === "all" ? "All Status" : s.replace(/_/g, " ")}
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
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Ref</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">From → To</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-primary">
                      {tx.tx_ref || tx.id?.slice(0, 8)}
                    </td>

                    <td className="px-5 py-3">
                      <StatusBadge status={tx.type} />
                    </td>

                    <td className="px-5 py-3 text-xs">
                      <span className="text-foreground">
                        {tx.from_provider || "External"}
                      </span>
                      <span className="text-muted-foreground mx-1">→</span>
                      <span className="text-foreground">
                        {tx.to_provider || "External"}
                      </span>
                    </td>

                    <td className="px-5 py-3 font-mono">
                      {formatCurrency(tx.amount, tx.currency)}
                    </td>

                    <td className="px-5 py-3">
                      <StatusBadge status={tx.status} />
                    </td>

                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {timeAgo(tx.created_date)}
                    </td>

                    <td className="px-5 py-3">
                      <TransactionActions tx={tx} onRefresh={load} />
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}