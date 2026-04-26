import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Shield, Upload, CheckCircle, XCircle, Eye,
  ChevronDown, ChevronUp
} from "lucide-react";
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
    user_email: "",
    full_name: "",
    id_type: "national_id",
    id_number: "",
    date_of_birth: "",
    nationality: "",
    address: "",
    document_front_url: "",
    document_back_url: "",
    selfie_url: "",
  });

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("kyc_submissions")
      .select("*")
      .order("created_date", { ascending: false })
      .limit(100);

    if (!error) setSubmissions(data);

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function uploadFile(file, field) {
    setUploading(p => ({ ...p, [field]: true }));

    const filePath = `kyc/${Date.now()}_${file.name}`;

    const { error } = await supabase.storage
      .from("kyc")
      .upload(filePath, file);

    if (error) {
      toast.error("Upload failed");
      setUploading(p => ({ ...p, [field]: false }));
      return;
    }

    const { data } = supabase.storage
      .from("kyc")
      .getPublicUrl(filePath);

    setForm(p => ({ ...p, [field]: data.publicUrl }));
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

    const { error } = await supabase
      .from("kyc_submissions")
      .insert([{
        ...form,
        status: passed ? "under_review" : "pending",
        auto_check_passed: passed,
        admin_notes: flags.length ? `Auto-check flags: ${flags.join(", ")}` : null,
      }]);

    if (error) {
      toast.error("Failed to submit KYC");
      setSaving(false);
      return;
    }

    toast.success("KYC submitted");
    setShowForm(false);
    setSaving(false);

    setForm({
      user_email: "",
      full_name: "",
      id_type: "national_id",
      id_number: "",
      date_of_birth: "",
      nationality: "",
      address: "",
      document_front_url: "",
      document_back_url: "",
      selfie_url: "",
    });

    load();
  }

  async function updateStatus(id, status) {
    const { error } = await supabase
      .from("kyc_submissions")
      .update({
        status,
        verified_at: status === "verified" ? new Date().toISOString() : null,
        admin_notes: adminNotes || null,
      })
      .eq("id", id);

    if (error) return toast.error("Update failed");

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
    <div className="space-y-7">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">KYC Verification</h1>
        <Button onClick={() => setShowForm(true)}>
          <Shield className="w-4 h-4" /> Submit KYC
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(stats).map(([k, v]) => (
          <div key={k} className="p-4 border rounded-xl">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="text-xl font-bold">{v}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-6">Loading...</div>
      ) : (
        <div className="space-y-3">
          {submissions.map(s => (
            <div key={s.id} className="border rounded-xl p-4">
              <div className="flex justify-between cursor-pointer"
                   onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                <div>
                  <p className="font-semibold">{s.full_name}</p>
                  <KycBadge status={s.status} />
                </div>

                <div className="flex gap-2">
                  {["pending", "under_review"].includes(s.status) && (
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); setReviewId(s.id); }}>
                      Review
                    </Button>
                  )}
                  {expanded === s.id ? <ChevronUp /> : <ChevronDown />}
                </div>
              </div>

              {expanded === s.id && (
                <div className="mt-3 space-y-2 text-sm">
                  <p>Email: {s.user_email}</p>
                  <p>ID: {s.id_type} — {s.id_number}</p>

                  {["document_front_url", "document_back_url", "selfie_url"].map(field =>
                    s[field] && (
                      <a key={field} href={s[field]} target="_blank" className="text-primary text-xs flex gap-1">
                        <Eye className="w-3 h-3" /> View {field}
                      </a>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewId} onOpenChange={() => setReviewId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review KYC</DialogTitle>
          </DialogHeader>

          {reviewSub && (
            <div className="space-y-3">
              <p>{reviewSub.full_name}</p>

              <Textarea
                placeholder="Admin notes"
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
              />

              <div className="flex gap-2">
                <Button variant="destructive" onClick={() => updateStatus(reviewId, "rejected")}>
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
                <Button onClick={() => updateStatus(reviewId, "verified")}>
                  <CheckCircle className="w-4 h-4" /> Verify
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}