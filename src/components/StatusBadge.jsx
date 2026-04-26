import { cn } from "@/lib/utils";

const statusConfig = {
  // Order statuses
  pending_deposit: { label: "Pending Deposit", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  deposit_received: { label: "Deposit Received", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  in_escrow: { label: "In Escrow", color: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  in_transit: { label: "In Transit", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" },
  pending_final_approval: { label: "Final Approval", color: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  completed: { label: "Completed", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  cancelled: { label: "Cancelled", color: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
  disputed: { label: "Disputed", color: "bg-red-500/15 text-red-400 border-red-500/20" },
  refunded: { label: "Refunded", color: "bg-pink-500/15 text-pink-400 border-pink-500/20" },

  // Transaction statuses
  pending_approval: { label: "Pending Approval", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  approved: { label: "Approved", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  executing: { label: "Executing", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  rejected: { label: "Rejected", color: "bg-red-500/15 text-red-400 border-red-500/20" },
  failed: { label: "Failed", color: "bg-red-500/15 text-red-400 border-red-500/20" },
  reversed: { label: "Reversed", color: "bg-pink-500/15 text-pink-400 border-pink-500/20" },

  // Wallet statuses
  active: { label: "Active", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  frozen: { label: "Frozen", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  suspended: { label: "Suspended", color: "bg-red-500/15 text-red-400 border-red-500/20" },
  closed: { label: "Closed", color: "bg-slate-500/15 text-slate-400 border-slate-500/20" },

  // Dispute statuses
  open: { label: "Open", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  under_review: { label: "Under Review", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  resolved_refund: { label: "Resolved (Refund)", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  resolved_release: { label: "Resolved (Release)", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  resolved_partial: { label: "Resolved (Partial)", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" },
  escalated: { label: "Escalated", color: "bg-red-500/15 text-red-400 border-red-500/20" },

  // Transaction types
  deposit: { label: "Deposit", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  internal_transfer: { label: "Transfer", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  payout: { label: "Payout", color: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  refund: { label: "Refund", color: "bg-pink-500/15 text-pink-400 border-pink-500/20" },
  reversal: { label: "Reversal", color: "bg-red-500/15 text-red-400 border-red-500/20" },
};

export default function StatusBadge({ status, className }) {
  const config = statusConfig[status] || { label: status, color: "bg-slate-500/15 text-slate-400 border-slate-500/20" };
  
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tracking-wide uppercase",
      config.color,
      className
    )}>
      {config.label}
    </span>
  );
}