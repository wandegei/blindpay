import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  AlertTriangle, Plus, CheckCircle, Upload, Eye,
  ChevronDown, ChevronUp, Scale
} from "lucide-react";
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

    const filePath = `evidence/${Date.now()}_${file.name}`;

    const { error } = await supabase.storage
      .from("evidence")
      .upload(filePath, file);

    if (error) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from("evidence")
      .getPublicUrl(filePath);

    onAdd(data.publicUrl);
    setUploading(false);
    toast.success("Evidence uploaded");
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 p-3 border border-dashed rounded-lg cursor-pointer text-xs">
        <Upload className="w-4 h-4" />
        {uploading ? "Uploading..." : "Upload evidence"}
        <input type="file" className="hidden" onChange={handleFile} />
      </label>

      {urls?.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noreferrer" className="text-xs text-primary flex gap-1">
          <Eye className="w-3 h-3" /> File {i + 1}
        </a>
      ))}
    </div>
  );
}

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showResolve, setShowResolve] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const [form, setForm] = useState({
    order_id: "",
    raised_by: "",
    reason: "",
    category: "non_delivery",
    evidence_urls: [],
  });

  const [resolveNotes, setResolveNotes] = useState("");
  const [resolveStatus, setResolveStatus] = useState("resolved_release");
  const [adminEvidence, setAdminEvidence] = useState([]);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("disputes")
      .select("*")
      .order("created_date", { ascending: false })
      .limit(50);

    if (!error) setDisputes(data);

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createDispute() {
    if (!form.order_id || !form.reason) {
      toast.error("Order ID and reason required");
      return;
    }

    const { data, error } = await supabase
      .from("disputes")
      .insert([{
        ...form,
        raised_by_role: "admin",
        status: "open",
      }])
      .select()
      .single();

    if (error) return toast.error("Failed to create dispute");

    await supabase.from("audit_logs").insert([{
      action: "dispute_opened",
      entity_type: "dispute",
      entity_id: data.id,
      actor_email: "admin",
      actor_role: "admin",
      details: JSON.stringify({
        reason: form.reason,
        category: form.category,
      }),
    }]);

    toast.success("Dispute opened");
    setShowCreate(false);
    load();
  }

  async function resolveDispute() {
    const d = showResolve;
    const allEvidence = [...(d.evidence_urls || []), ...adminEvidence];

    await supabase
      .from("disputes")
      .update({
        status: resolveStatus,
        resolution_notes: resolveNotes,
        resolved_by: "admin",
        resolved_at: new Date().toISOString(),
        evidence_urls: allEvidence,
      })
      .eq("id", d.id);

    await supabase.from("audit_logs").insert([{
      action: "dispute_resolved",
      entity_type: "dispute",
      entity_id: d.id,
      actor_email: "admin",
      actor_role: "admin",
      previous_state: d.status,
      new_state: resolveStatus,
      details: JSON.stringify({ notes: resolveNotes }),
    }]);

    toast.success("Dispute resolved");
    setShowResolve(null);
    load();
  }

  async function setUnderReview(d) {
    await supabase
      .from("disputes")
      .update({ status: "under_review" })
      .eq("id", d.id);

    toast.success("Marked as under review");
    load();
  }

  const open = disputes.filter(d => ["open", "under_review", "escalated"].includes(d.status));
  const closed = disputes.filter(d => !["open", "under_review", "escalated"].includes(d.status));

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-xl font-bold">Disputes</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Open Dispute
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-6">Loading...</div>
      ) : (
        <div className="space-y-4">
          {open.map(d => (
            <DisputeCard
              key={d.id}
              d={d}
              expanded={expanded}
              setExpanded={setExpanded}
              onReview={setUnderReview}
              onResolve={setShowResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DisputeCard({ d, expanded, setExpanded, onReview, onResolve }) {
  const isActive = ["open", "under_review"].includes(d.status);

  return (
    <div className="border rounded-xl p-4">
      <div className="flex justify-between cursor-pointer"
           onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
        <div>
          <StatusBadge status={d.status} />
          <p className="text-sm mt-1">{d.reason}</p>
        </div>

        <div className="flex gap-2">
          {isActive && onReview && (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); onReview(d); }}>
              Review
            </Button>
          )}
          {isActive && onResolve && (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); onResolve(d); }}>
              Resolve
            </Button>
          )}
        </div>
      </div>

      {expanded === d.id && d.evidence_urls?.length > 0 && (
        <div className="mt-3">
          {d.evidence_urls.map((url, i) => (
            <a key={i} href={url} target="_blank" className="text-xs text-primary block">
              Evidence {i + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}