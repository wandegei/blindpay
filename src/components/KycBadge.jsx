import { ShieldCheck, ShieldX, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const configs = {
  verified: {
    icon: ShieldCheck,
    label: "KYC Verified",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  },
  pending: {
    icon: Clock,
    label: "KYC Pending",
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25",
  },
  under_review: {
    icon: Clock,
    label: "Under Review",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/25",
  },
  rejected: {
    icon: ShieldX,
    label: "KYC Rejected",
    color: "text-red-400 bg-red-500/10 border-red-500/25",
  },
  none: {
    icon: AlertTriangle,
    label: "KYC Required",
    color: "text-muted-foreground bg-secondary border-border",
  },
};

export default function KycBadge({ status = "none", className }) {
  const cfg = configs[status] || configs.none;
  const Icon = cfg.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border",
      cfg.color, className
    )}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}