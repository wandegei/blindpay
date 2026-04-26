import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Plus, CheckCircle, Upload, Eye, ChevronDown, ChevronUp, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import StatusBadge from "../components/StatusBadge";
import { timeAgo } from "../lib/helpers";
import { toast } from "sonner";

const CATEGORIES = ["non_delivery", "wrong_amount", "unauthorized", "quality_issue", "fraud_suspicion", "other"];
const RESOLUTIONS = [
  { value: "resolved_release", label: "Release Funds to Provider" },
  { value: "resolved_refund", label: "Full Refund to Customer" },
  { value: "resolved_partial", label: "Partial Resolution" },
  { value: "closed", label: "Close — No Action" },
];

function EvidenceUploader({ urls, onAdd }) {
  const [uploading, setUploading] = useState(false);
  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onAdd(file_url);
    setUploading(false);
    toast.success("Evidence uploaded");
  }
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 p-3 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary/40 transition-colors text-xs text-muted-foreground hover:text-foreground">
        <Upload className="w-4 h-4" />
        {uploading ? "Uploading..." : "Upload evidence (image or PDF)"}
        <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFile} disabled={uploading} />
      </label>
      {urls?.length > 0 && (
        <div className="space-y-1">
          {urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <Eye className="w-3 h-3" /> Evidence file {i + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showResolve, setShowResolve] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({ order_id: "", raised_by: "", reason: "", category: "non_delivery", evidence_urls: [] });
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolveStatus, setResolveStatus] = useState("resolved_release");
  const [adminEvidence, setAdminEvidence] = useState([]);

  async function load() {
    setLoading(true);
    const data = await base44.entities.Dispute.list("-created_date", 50);
    setDisputes(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createDispute() {
    if (!form.order_id || !form.reason) { toast.error("Order ID and reason required"); return; }
    const d = await base44.entities.Dispute.create({ ...form, raised_by_role: "admin", status: "open" });
    await base44.entities.AuditLog.create({
      action: "dispute_opened", entity_type: "dispute", entity_id: form.order_id,
      actor_email: "admin", actor_role: "admin",
      details: JSON.stringify({ reason: form.reason, category: form.category, evidence_count: (form.evidence_urls || []).length })
    });
    toast.success("Dispute opened");
    setShowCreate(false);
    setForm({ order_id: "", raised_by: "", reason: "", category: "non_delivery", evidence_urls: [] });
    load();
  }

  async function resolveDispute() {
    const d = showResolve;
    const allEvidence = [...(d.evidence_urls || []), ...adminEvidence];
    await base44.entities.Dispute.update(d.id, {
      status: resolveStatus,
      resolution_notes: resolveNotes,
      resolved_by: "admin",
      resolved_at: new Date().toISOString(),
      evidence_urls: allEvidence,
    });
    await base44.entities.AuditLog.create({
      action: "dispute_resolved", entity_type: "dispute", entity_id: d.id,
      actor_email: "admin", actor_role: "admin",
      details: JSON.stringify({ resolution: resolveStatus, notes: resolveNotes, evidence_count: allEvidence.length }),
      previous_state: d.status, new_state: resolveStatus
    });
    toast.success("Dispute resolved");
    setShowResolve(null);
    setResolveNotes("");
    setAdminEvidence([]);
    load();
  }

  async function setUnderReview(d) {
    await base44.entities.Dispute.update(d.id, { status: "under_review" });
    toast.success("Marked as under review");
    load();
  }

  const open = disputes.filter(d => ["open", "under_review", "escalated"].includes(d.status));
  const closed = disputes.filter(d => !["open", "under_review", "escalated"].includes(d.status));

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Risk</p>
          <h1 className="text-2xl font-bold tracking-tight">Disputes</h1>
          <p className="text-sm text-muted-foreground mt-1">{open.length} active · {closed.length} resolved</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Open Dispute
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Active */}
          {open.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Active Disputes ({open.length})</p>
              <div className="space-y-3">
                {open.map(d => <DisputeCard key={d.id} d={d} expanded={expanded} setExpanded={setExpanded} onReview={setUnderReview} onResolve={setShowResolve} />)}
              </div>
            </div>
          )}

          {/* Resolved */}
          {closed.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resolved ({closed.length})</p>
              <div className="space-y-3">
                {closed.map(d => <DisputeCard key={d.id} d={d} expanded={expanded} setExpanded={setExpanded} />)}
              </div>
            </div>
          )}

          {disputes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No disputes</p>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Open Dispute</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Order ID *</Label>
              <Input value={form.order_id} onChange={e => setForm(p => ({ ...p, order_id: e.target.value }))} className="bg-secondary mt-1" placeholder="Paste order ID" />
            </div>
            <div>
              <Label>Raised By (email)</Label>
              <Input value={form.raised_by} onChange={e => setForm(p => ({ ...p, raised_by: e.target.value }))} className="bg-secondary mt-1" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="bg-secondary mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} className="bg-secondary mt-1" rows={3} />
            </div>
            <div>
              <Label>Supporting Evidence</Label>
              <div className="mt-1">
                <EvidenceUploader urls={form.evidence_urls} onAdd={url => setForm(p => ({ ...p, evidence_urls: [...(p.evidence_urls || []), url] }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createDispute}>Open Dispute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Resolve + Evidence Comparison Dialog */}
      <Dialog open={!!showResolve} onOpenChange={() => { setShowResolve(null); setAdminEvidence([]); setResolveNotes(""); }}>
        <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" /> Dispute Review & Resolution
            </DialogTitle>
          </DialogHeader>
          {showResolve && (
            <div className="space-y-5 py-2">
              {/* Dispute info */}
              <div className="p-4 bg-secondary/40 rounded-xl space-y-2 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={showResolve.status} />
                  <span className="bg-secondary px-2 py-0.5 rounded text-xs">{showResolve.category?.replace(/_/g, " ")}</span>
                </div>
                <p className="text-foreground">{showResolve.reason}</p>
                <p className="text-xs text-muted-foreground">Raised by: {showResolve.raised_by || "—"} · {timeAgo(showResolve.created_date)}</p>
              </div>

              {/* Evidence comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submitted Evidence ({(showResolve.evidence_urls || []).length})</p>
                  {(showResolve.evidence_urls || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 bg-secondary/50 rounded-lg">No evidence submitted</p>
                  ) : (
                    <div className="space-y-1">
                      {showResolve.evidence_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline p-2 bg-secondary/40 rounded">
                          <Eye className="w-3 h-3" /> Evidence file {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Evidence</p>
                  <EvidenceUploader urls={adminEvidence} onAdd={url => setAdminEvidence(p => [...p, url])} />
                </div>
              </div>

              {/* Resolution */}
              <div className="space-y-3 border-t border-border pt-4">
                <div>
                  <Label>Resolution Decision</Label>
                  <Select value={resolveStatus} onValueChange={setResolveStatus}>
                    <SelectTrigger className="bg-secondary mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RESOLUTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Resolution Notes</Label>
                  <Textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} className="bg-secondary mt-1" rows={3} placeholder="Explain the decision..." />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowResolve(null); setAdminEvidence([]); setResolveNotes(""); }}>Cancel</Button>
            <Button onClick={resolveDispute} className="gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Finalize Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DisputeCard({ d, expanded, setExpanded, onReview, onResolve }) {
  const isActive = ["open", "under_review", "escalated"].includes(d.status);
  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-colors ${isActive ? "border-border hover:border-primary/20" : "border-border/50"}`}>
      <div className="flex items-start gap-4 p-5 cursor-pointer" onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <StatusBadge status={d.status} />
            <span className="text-xs bg-secondary px-2 py-0.5 rounded text-secondary-foreground">{d.category?.replace(/_/g, " ")}</span>
            {(d.evidence_urls || []).length > 0 && (
              <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">
                {d.evidence_urls.length} evidence file{d.evidence_urls.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-sm text-foreground">{d.reason}</p>
          <div className="flex gap-4 mt-1.5 text-[11px] text-muted-foreground">
            <span>Order: <span className="font-mono text-primary">{d.order_id?.slice(0, 8)}</span></span>
            <span>By: {d.raised_by || "—"}</span>
            <span>{timeAgo(d.created_date)}</span>
          </div>
          {d.resolution_notes && (
            <p className="mt-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2.5">
              <span className="font-semibold">Resolution:</span> {d.resolution_notes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isActive && onReview && d.status === "open" && (
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={e => { e.stopPropagation(); onReview(d); }}>
              <Eye className="w-3 h-3" /> Review
            </Button>
          )}
          {isActive && onResolve && (
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={e => { e.stopPropagation(); onResolve(d); }}>
              <CheckCircle className="w-3 h-3" /> Resolve
            </Button>
          )}
          {expanded === d.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>
      {expanded === d.id && (d.evidence_urls || []).length > 0 && (
        <div className="px-5 pb-5 border-t border-border/50 pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Evidence Files</p>
          <div className="flex flex-wrap gap-2">
            {d.evidence_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline bg-secondary/50 px-3 py-1.5 rounded-lg">
                <Eye className="w-3 h-3" /> File {i + 1}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}