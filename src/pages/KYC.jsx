import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Upload, CheckCircle, XCircle, Clock, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import KycBadge from "../components/KycBadge";
import DownloadReportButton from "../components/DownloadReportButton";
import { timeAgo } from "../lib/helpers";
import { toast } from "sonner";

function runAutoCheck(form) {
  const flags = [];
  if (!form.id_number || form.id_number.length < 6) flags.push("Invalid ID number");
  if (!form.date_of_birth) flags.push("Missing date of birth");
  if (!form.document_front_url) flags.push("No document uploaded");
  return { passed: flags.length === 0, flags };
}

export default function KYC() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reviewId, setReviewId] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});
  const [adminNotes, setAdminNotes] = useState("");

  const [form, setForm] = useState({
    user_email: "", full_name: "", id_type: "national_id", id_number: "",
    date_of_birth: "", nationality: "", address: "",
    document_front_url: "", document_back_url: "", selfie_url: "",
  });

  async function load() {
    setLoading(true);
    const data = await base44.entities.KycSubmission.list("-created_date", 100);
    setSubmissions(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function uploadFile(file, field) {
    setUploading(p => ({ ...p, [field]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, [field]: file_url }));
    setUploading(p => ({ ...p, [field]: false }));
    toast.success("File uploaded");
  }

  async function submitKyc() {
    if (!form.user_email || !form.full_name || !form.id_number) {
      toast.error("Email, full name, and ID number are required");
      return;
    }
    setSaving(true);
    const { passed, flags } = runAutoCheck(form);
    await base44.entities.KycSubmission.create({
      ...form,
      status: passed ? "under_review" : "pending",
      auto_check_passed: passed,
      admin_notes: flags.length > 0 ? `Auto-check flags: ${flags.join(", ")}` : "",
    });
    toast.success(passed ? "KYC submitted — under review" : `KYC submitted with warnings: ${flags.join(", ")}`);
    setShowForm(false);
    setForm({ user_email: "", full_name: "", id_type: "national_id", id_number: "", date_of_birth: "", nationality: "", address: "", document_front_url: "", document_back_url: "", selfie_url: "" });
    setSaving(false);
    load();
  }

  async function updateStatus(id, status) {
    await base44.entities.KycSubmission.update(id, {
      status,
      verified_at: status === "verified" ? new Date().toISOString() : undefined,
      admin_notes: adminNotes || undefined,
    });
    toast.success(`KYC ${status}`);
    setReviewId(null);
    setAdminNotes("");
    load();
  }

  const reviewSub = submissions.find(s => s.id === reviewId);
  const stats = {
    total: submissions.length,
    verified: submissions.filter(s => s.status === "verified").length,
    pending: submissions.filter(s => ["pending", "under_review"].includes(s.status)).length,
    rejected: submissions.filter(s => s.status === "rejected").length,
  };

  return (
    <div className="space-y-7 animate-slide-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Compliance</p>
          <h1 className="text-3xl font-extrabold tracking-tight">KYC Verification</h1>
          <p className="text-sm text-muted-foreground mt-1">Identity verification and compliance management</p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadReportButton type="kyc" data={submissions} />
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Shield className="w-4 h-4" /> Submit KYC
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Submissions", value: stats.total, color: "text-foreground" },
          { label: "Verified", value: stats.verified, color: "text-emerald-400" },
          { label: "Pending Review", value: stats.pending, color: "text-yellow-400" },
          { label: "Rejected", value: stats.rejected, color: "text-red-400" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{s.label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Submissions list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-4 p-5 cursor-pointer hover:bg-secondary/20 transition-colors"
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-sm">{s.full_name}</span>
                    <KycBadge status={s.status} />
                    {!s.auto_check_passed && (
                      <span className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full font-semibold">AUTO-CHECK FAILED</span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                    <span>{s.user_email}</span>
                    <span className="font-mono">{s.id_type?.replace(/_/g, " ")} · {s.id_number}</span>
                    <span>{timeAgo(s.created_date)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {["pending", "under_review"].includes(s.status) && (
                    <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={e => { e.stopPropagation(); setReviewId(s.id); }}>
                      <Eye className="w-3 h-3" /> Review
                    </Button>
                  )}
                  {expanded === s.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {expanded === s.id && (
                <div className="px-5 pb-5 border-t border-border/50 pt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2 text-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Identity Details</p>
                    {[
                      ["Nationality", s.nationality],
                      ["Date of Birth", s.date_of_birth],
                      ["Address", s.address],
                      ["Risk Level", s.risk_level],
                    ].map(([k, v]) => v && (
                      <div key={k} className="flex justify-between">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="text-foreground capitalize">{v}</span>
                      </div>
                    ))}
                    {s.admin_notes && (
                      <div className="mt-3 p-3 bg-yellow-500/8 border border-yellow-500/20 rounded-lg text-xs text-yellow-300">
                        {s.admin_notes}
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</p>
                    {[["Front", s.document_front_url], ["Back", s.document_back_url], ["Selfie", s.selfie_url]].map(([label, url]) => (
                      url ? (
                        <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-primary hover:underline">
                          <Eye className="w-3 h-3" /> View {label} of ID
                        </a>
                      ) : (
                        <p key={label} className="text-xs text-muted-foreground">No {label.toLowerCase()} uploaded</p>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {submissions.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No KYC submissions yet</p>
            </div>
          )}
        </div>
      )}

      {/* Submit KYC Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Submit KYC</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Full Name *</Label><Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="bg-secondary mt-1" /></div>
              <div><Label>Email *</Label><Input value={form.user_email} onChange={e => setForm(p => ({ ...p, user_email: e.target.value }))} className="bg-secondary mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ID Type</Label>
                <Select value={form.id_type} onValueChange={v => setForm(p => ({ ...p, id_type: v }))}>
                  <SelectTrigger className="bg-secondary mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["national_id", "passport", "drivers_license", "company_reg"].map(t =>
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>ID Number *</Label><Input value={form.id_number} onChange={e => setForm(p => ({ ...p, id_number: e.target.value }))} className="bg-secondary mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))} className="bg-secondary mt-1" /></div>
              <div><Label>Nationality</Label><Input value={form.nationality} onChange={e => setForm(p => ({ ...p, nationality: e.target.value }))} className="bg-secondary mt-1" /></div>
            </div>
            <div><Label>Address</Label><Textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="bg-secondary mt-1" rows={2} /></div>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</p>
              {[
                { label: "ID Front", field: "document_front_url" },
                { label: "ID Back", field: "document_back_url" },
                { label: "Selfie", field: "selfie_url" },
              ].map(({ label, field }) => (
                <div key={field} className="flex items-center gap-3">
                  <label className="flex-1 flex items-center gap-2 p-3 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary/40 transition-colors text-xs text-muted-foreground hover:text-foreground">
                    <Upload className="w-4 h-4" />
                    {form[field] ? <span className="text-emerald-400 font-medium">{label} uploaded ✓</span> : `Upload ${label}`}
                    <input type="file" className="hidden" accept="image/*,.pdf"
                      onChange={e => e.target.files[0] && uploadFile(e.target.files[0], field)} />
                  </label>
                  {uploading[field] && <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={submitKyc} disabled={saving} className="gap-2">
              {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
              Submit KYC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Review Dialog */}
      <Dialog open={!!reviewId} onOpenChange={() => { setReviewId(null); setAdminNotes(""); }}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader><DialogTitle>Admin KYC Review</DialogTitle></DialogHeader>
          {reviewSub && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-secondary/40 rounded-lg space-y-1.5 text-sm">
                <p><span className="text-muted-foreground">Name:</span> <span className="font-semibold">{reviewSub.full_name}</span></p>
                <p><span className="text-muted-foreground">ID:</span> <span className="font-mono">{reviewSub.id_type?.replace(/_/g, " ")} · {reviewSub.id_number}</span></p>
                <p><span className="text-muted-foreground">Auto-check:</span> <span className={reviewSub.auto_check_passed ? "text-emerald-400" : "text-red-400"}>{reviewSub.auto_check_passed ? "Passed" : "Failed"}</span></p>
              </div>
              {reviewSub.admin_notes && (
                <div className="p-3 bg-yellow-500/8 border border-yellow-500/20 rounded-lg text-xs text-yellow-300">{reviewSub.admin_notes}</div>
              )}
              <div>
                <Label>Admin Notes</Label>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} className="bg-secondary mt-1" rows={3} placeholder="Optional notes..." />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setReviewId(null); setAdminNotes(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => updateStatus(reviewId, "rejected")} className="gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Reject
            </Button>
            <Button onClick={() => updateStatus(reviewId, "verified")} className="gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}