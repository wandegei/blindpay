import { calculateFees, feeLabel } from "@/lib/feeEngine";
import { formatCurrency } from "@/lib/helpers";
import { Info } from "lucide-react";

/**
 * Displays a fee breakdown panel for a given transfer amount.
 * @param {object} props
 * @param {number} props.amount
 * @param {string} [props.currency]
 * @param {string} [props.forceTier]
 */
export default function FeeBreakdown({ amount, currency = "UGX", forceTier }) {
  if (!amount || amount <= 0) return null;
  const fees = calculateFees(amount, forceTier);

  return (
    <div className="mt-3 p-3 bg-secondary/50 border border-border/60 rounded-lg space-y-1.5 text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground font-semibold uppercase tracking-wider mb-2 text-[10px]">
        <Info className="w-3 h-3" /> Fee Breakdown
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Gross amount</span>
        <span className="font-mono font-semibold">{formatCurrency(amount, currency)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Service fee <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded ml-1">{fees.tier}</span></span>
        <span className="font-mono text-yellow-400">−{formatCurrency(fees.tierFee, currency)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Platform fee (0.30%)</span>
        <span className="font-mono text-yellow-400">−{formatCurrency(fees.platformFee, currency)}</span>
      </div>
      <div className="border-t border-border/40 pt-1.5 flex justify-between font-semibold">
        <span>Net transfer</span>
        <span className="font-mono text-emerald-400">{formatCurrency(fees.netAmount, currency)}</span>
      </div>
      <p className="text-[10px] text-muted-foreground/70 pt-0.5">{feeLabel(fees)} · auto-deducted on transfer</p>
    </div>
  );
}