import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Wallet, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import StatusBadge from "../components/StatusBadge";
import { formatCurrency } from "../lib/helpers";
import { toast } from "sonner";

export default function Wallets() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    provider_name: "", provider_email: "", provider_type: "provider",
    currency: "UGX", payout_method: "mtn_momo", payout_details: ""
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const data = await base44.entities.Wallet.list("-created_date", 50);
    setWallets(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createWallet() {
    if (!form.provider_name) { toast.error("Provider name required"); return; }
    setSaving(true);
    await base44.entities.Wallet.create({
      ...form, balance: 0, locked_balance: 0, total_received: 0, total_sent: 0, status: "active"
    });
    await base44.entities.AuditLog.create({
      action: "admin_note_added", entity_type: "wallet", entity_id: "new",
      actor_email: "admin", actor_role: "admin",
      details: JSON.stringify({ action: "wallet_created", name: form.provider_name })
    });
    toast.success("Wallet created");
    setSaving(false);
    setShowCreate(false);
    setForm({ provider_name: "", provider_email: "", provider_type: "provider", currency: "UGX", payout_method: "mtn_momo", payout_details: "" });
    load();
  }

  async function toggleFreeze(wallet) {
    const newStatus = wallet.status === "frozen" ? "active" : "frozen";
    await base44.entities.Wallet.update(wallet.id, {
      status: newStatus,
      frozen_reason: newStatus === "frozen" ? "Admin freeze" : ""
    });
    await base44.entities.AuditLog.create({
      action: newStatus === "frozen" ? "wallet_frozen" : "wallet_unfrozen",
      entity_type: "wallet", entity_id: wallet.id,
      actor_email: "admin", actor_role: "admin",
      previous_state: wallet.status, new_state: newStatus
    });
    toast.success(newStatus === "frozen" ? "Wallet frozen" : "Wallet unfrozen");
    load();
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallets</h1>
          <p className="text-sm text-muted-foreground mt-1">{wallets.length} wallets</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Wallet
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map(w => (
            <div key={w.id} className="bg-card border border-border rounded-xl p-5 space-y-4 hover:border-primary/20 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{w.provider_name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{w.provider_type?.replace(/_/g, " ")} · {w.currency}</p>
                </div>
                <StatusBadge status={w.status} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Available</p>
                  <p className="text-lg font-bold font-mono text-foreground">{formatCurrency(w.balance || 0, w.currency)}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Locked</p>
                  <p className="text-lg font-bold font-mono text-yellow-400">{formatCurrency(w.locked_balance || 0, w.currency)}</p>
                </div>
              </div>

              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>In: {formatCurrency(w.total_received || 0, w.currency)}</span>
                <span>Out: {formatCurrency(w.total_sent || 0, w.currency)}</span>
              </div>

              <Button
                size="sm" variant="outline" className="w-full gap-2 h-8"
                onClick={() => toggleFreeze(w)}
              >
                {w.status === "frozen" ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {w.status === "frozen" ? "Unfreeze" : "Freeze"}
              </Button>
            </div>
          ))}

          {wallets.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Wallet className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No wallets yet. Create an escrow master wallet and provider wallets to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader><DialogTitle>Create Wallet</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Provider Name *</Label>
              <Input value={form.provider_name} onChange={e => setForm(p => ({ ...p, provider_name: e.target.value }))} className="bg-secondary" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.provider_email} onChange={e => setForm(p => ({ ...p, provider_email: e.target.value }))} className="bg-secondary" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.provider_type} onValueChange={v => setForm(p => ({ ...p, provider_type: v }))}>
                  <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="escrow_master">Escrow Master</SelectItem>
                    <SelectItem value="provider">Provider</SelectItem>
                    <SelectItem value="customer_refund">Customer Refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                  <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["UGX", "KES", "TZS", "RWF", "USD"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payout Method</Label>
                <Select value={form.payout_method} onValueChange={v => setForm(p => ({ ...p, payout_method: v }))}>
                  <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                    <SelectItem value="airtel_money">Airtel Money</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payout Details</Label>
                <Input value={form.payout_details} onChange={e => setForm(p => ({ ...p, payout_details: e.target.value }))} placeholder="Phone / Account #" className="bg-secondary" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createWallet} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}