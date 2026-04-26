import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, CheckCircle, XCircle } from "lucide-react";
import { timeAgo, formatCurrency } from "../../lib/helpers";

const typeIcon = {
  deposit: ArrowDownLeft,
  internal_transfer: ArrowRightLeft,
  payout: ArrowUpRight,
  refund: ArrowDownLeft,
  reversal: XCircle,
};

const typeColor = {
  deposit: "text-emerald-400",
  internal_transfer: "text-blue-400",
  payout: "text-purple-400",
  refund: "text-pink-400",
  reversal: "text-red-400",
};

export default function RecentActivityFeed({ transactions }) {
  const recent = transactions.slice(0, 10);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-sm font-semibold mb-4">Recent Activity</h2>
      <div className="space-y-3">
        {recent.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No recent activity</p>
        )}
        {recent.map((tx) => {
          const Icon = typeIcon[tx.type] || ArrowRightLeft;
          const color = typeColor[tx.type] || "text-muted-foreground";
          return (
            <div key={tx.id} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg bg-secondary flex items-center justify-center ${color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {tx.type === "deposit" && "Deposit received"}
                  {tx.type === "internal_transfer" && `${tx.from_provider || "—"} → ${tx.to_provider || "—"}`}
                  {tx.type === "payout" && "Payout initiated"}
                  {tx.type === "refund" && "Refund processed"}
                  {tx.type === "reversal" && "Reversal"}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">{tx.tx_ref || tx.id?.slice(0, 8)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono font-semibold text-foreground">{formatCurrency(tx.amount, tx.currency)}</p>
                <p className="text-[10px] text-muted-foreground">{timeAgo(tx.created_date)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}