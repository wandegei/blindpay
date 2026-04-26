import StatusBadge from "../StatusBadge";

const stages = [
  { key: "pending_deposit", label: "Pending Deposit", color: "bg-yellow-500" },
  { key: "deposit_received", label: "Deposit Received", color: "bg-blue-500" },
  { key: "in_escrow", label: "In Escrow", color: "bg-purple-500" },
  { key: "in_transit", label: "In Transit", color: "bg-cyan-500" },
  { key: "pending_final_approval", label: "Final Approval", color: "bg-orange-500" },
  { key: "completed", label: "Completed", color: "bg-emerald-500" },
];

export default function PipelineOverview({ orders }) {
  const counts = {};
  stages.forEach(s => { counts[s.key] = 0; });
  orders.forEach(o => {
    if (counts[o.status] !== undefined) counts[o.status]++;
  });

  const maxCount = Math.max(...Object.values(counts), 1);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold">Order Pipeline</h2>
        <span className="text-xs text-muted-foreground">{total} active</span>
      </div>
      <div className="space-y-4">
        {stages.map(({ key, color }) => (
          <div key={key} className="flex items-center gap-4">
            <div className="w-36 flex-shrink-0">
              <StatusBadge status={key} />
            </div>
            <div className="flex-1 h-5 bg-secondary/60 rounded-full overflow-hidden">
              <div
                className={`h-full ${color} opacity-70 rounded-full transition-all duration-700 relative`}
                style={{ width: `${Math.max((counts[key] / maxCount) * 100, counts[key] > 0 ? 6 : 0)}%` }}
              >
                <div className="absolute inset-0 bg-white/10 rounded-full" />
              </div>
            </div>
            <span className={`text-xs font-mono font-bold w-6 text-right ${counts[key] > 0 ? "text-foreground" : "text-muted-foreground"}`}>
              {counts[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}