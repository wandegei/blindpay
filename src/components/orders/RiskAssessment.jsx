import { useState } from "react";
import { ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle, TrendingUp, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { runRiskAssessment } from "../../lib/riskEngine";
import { toast } from "sonner";

const FLAG_LABELS = {
  HIGH_VALUE_TRANSACTION: { label: "High Value", color: "text-red-400 bg-red-500/10 border-red-500/20" },
  MISSING_CUSTOMER_EMAIL: { label: "No Email", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  MISSING_CUSTOMER_PHONE: { label: "No Phone", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  UNVERIFIED_DEPOSIT: { label: "Unverified Deposit", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  REJECTED_TRANSACTIONS: { label: "Rejected Txns", color: "text-red-400 bg-red-500/10 border-red-500/20" },
  REVERSED_TRANSACTIONS: { label: "Reversed Txns", color: "text-red-400 bg-red-500/10 border-red-500/20" },
  STALLED_ORDER: { label: "Stalled >24h", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  PREVIOUSLY_FROZEN: { label: "Was Frozen", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  DISPUTE_HISTORY: { label: "Dispute History", color: "text-red-400 bg-red-500/10 border-red-500/20" },
  REPEAT_FLAGGED_CUSTOMER: { label: "Flagged Customer", color: "text-red-400 bg-red-500/10 border-red-500/20" },
};

function ScoreGauge({ score }) {
  const color = score > 70 ? "#ef4444" : score > 40 ? "#f59e0b" : "#10b981";
  const circumference = 2 * Math.PI * 36;
  const dash = (score / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--secondary))" strokeWidth="7" />
        <circle
          cx="40" cy="40" r="36" fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold font-mono" style={{ color }}>{score}</span>
        <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Risk</span>
      </div>
    </div>
  );
}

function BreakdownBar({ label, value, max, icon: Icon }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="w-3 h-3" />
          {label}
        </div>
        <span className="font-mono font-semibold text-foreground">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700",
            pct > 70 ? "bg-red-500" : pct > 40 ? "bg-yellow-500" : "bg-emerald-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

import { useEffect } from "react";

export default function RiskAssessment({ order, transactions, auditLogs, allOrders, onRefresh }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  // Auto-run assessment when data loads
  useEffect(() => {
    if (transactions.length > 0 || auditLogs.length > 0) {
      handleRun();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const score = result?.score ?? order.risk_score ?? 0;
  const flags = result?.flags ?? order.risk_flags ?? [];
  const breakdown = result?.breakdown ?? null;
  const isHighRisk = score > 70;
  const isMediumRisk = score > 40 && score <= 70;

  async function handleRun() {
    setRunning(true);
    const res = await runRiskAssessment(order, transactions, auditLogs, allOrders);
    setResult(res);
    if (res.score > 70) {
      toast.error(`⚠️ High risk detected (${res.score}/100) — flagged for admin review`, { duration: 5000 });
    } else {
      toast.success(`Risk assessment complete: ${res.score}/100`);
    }
    onRefresh();
    setRunning(false);
  }

  return (
    <div className={cn(
      "bg-card border rounded-xl p-5 space-y-4",
      isHighRisk ? "border-red-500/40 shadow-lg shadow-red-500/5" :
      isMediumRisk ? "border-yellow-500/30" : "border-border"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isHighRisk ? (
            <ShieldAlert className="w-4 h-4 text-red-400" />
          ) : (
            <ShieldCheck className={cn("w-4 h-4", isMediumRisk ? "text-yellow-400" : "text-emerald-400")} />
          )}
          <h3 className="text-sm font-semibold">Risk Assessment</h3>
          {isHighRisk && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 uppercase tracking-wider animate-pulse-glow">
              Flagged
            </span>
          )}
        </div>
        <Button
          size="sm" variant="outline"
          onClick={handleRun}
          disabled={running}
          className="gap-1.5 h-7 text-xs"
        >
          <RefreshCw className={cn("w-3 h-3", running && "animate-spin")} />
          {running ? "Analyzing..." : "Run Assessment"}
        </Button>
      </div>

      {/* Gauge + flags */}
      <div className="flex items-start gap-5">
        <ScoreGauge score={score} />
        <div className="flex-1 space-y-3">
          {/* Risk level label */}
          <div className={cn(
            "text-xs font-semibold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5",
            isHighRisk ? "bg-red-500/10 text-red-400 border-red-500/20" :
            isMediumRisk ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
            "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          )}>
            {isHighRisk ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
            {isHighRisk ? "HIGH RISK — Admin Review Required" : isMediumRisk ? "MEDIUM RISK — Monitor Closely" : "LOW RISK — Looks Clean"}
          </div>

          {/* Flags */}
          {flags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {flags.map(f => {
                const cfg = FLAG_LABELS[f] || { label: f, color: "text-muted-foreground bg-secondary border-border" };
                return (
                  <span key={f} className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", cfg.color)}>
                    {cfg.label}
                  </span>
                );
              })}
            </div>
          )}

          {flags.length === 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="w-3 h-3" /> No risk flags detected
            </p>
          )}
        </div>
      </div>

      {/* Score breakdown */}
      {breakdown && (
        <div className="border-t border-border pt-4 space-y-2.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Score Breakdown</p>
          <BreakdownBar label="Transaction Volume" value={breakdown.volume} max={30} icon={TrendingUp} />
          <BreakdownBar label="Verification" value={breakdown.verification} max={25} icon={ShieldAlert} />
          <BreakdownBar label="Transaction Anomalies" value={breakdown.transactions} max={25} icon={AlertTriangle} />
          <BreakdownBar label="Audit History" value={breakdown.audit} max={20} icon={ShieldCheck} />
        </div>
      )}
    </div>
  );
}