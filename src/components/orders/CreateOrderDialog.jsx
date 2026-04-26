import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateRef } from "../../lib/helpers";
import { toast } from "sonner";

export default function CreateOrderDialog({ open, onClose, onCreated }) {
  const [wallets, setWallets] = useState([]);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    total_amount: "",
    currency: "UGX",
    deposit_method: "mtn_momo",
    provider_chain: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      base44.entities.Wallet.list().then(setWallets);
    }
  }, [open]);

  const providers = wallets.filter(w => w.provider_type === "provider");

  function toggleProvider(id) {
    setForm(prev => {
      const chain = prev.provider_chain.includes(id)
        ? prev.provider_chain.filter(p => p !== id)
        : [...prev.provider_chain, id];
      return { ...prev, provider_chain: chain };
    });
  }

  async function handleCreate() {
    if (!form.customer_name || !form.total_amount) {
      toast.error("Customer name and amount are required");
      return;
    }
    setSaving(true);
    const order = await base44.entities.Order.create({
      ...form,
      total_amount: parseFloat(form.total_amount),
      order_ref: generateRef("ORD"),
      status: "pending_deposit",
      current_stage: 0,
      risk_score: 0,
      risk_flags: [],
      frozen: false,
    });

    await base44.entities.AuditLog.create({
      action: "order_created",
      entity_type: "order",
      entity_id: order.id,
      actor_email: "admin",
      actor_role: "admin",
      details: JSON.stringify({ amount: form.total_amount, currency: form.currency }),
      new_state: "pending_deposit",
    });

    toast.success("Order created successfully");
    setSaving(false);
    onClose();
    onCreated();
    setForm({ customer_name: "", customer_email: "", customer_phone: "", total_amount: "", currency: "UGX", deposit_method: "mtn_momo", provider_chain: [] });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Customer Name *</Label>
              <Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} className="bg-secondary" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.customer_email} onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))} className="bg-secondary" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} className="bg-secondary" />
            </div>
            <div>
              <Label>Amount *</Label>
              <Input type="number" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: e.target.value }))} className="bg-secondary" />
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
            <div className="col-span-2">
              <Label>Deposit Method</Label>
              <Select value={form.deposit_method} onValueChange={v => setForm(p => ({ ...p, deposit_method: v }))}>
                <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                  <SelectItem value="airtel_money">Airtel Money</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Provider Chain */}
          <div>
            <Label className="mb-2 block">Provider Chain (click to add, order matters)</Label>
            <div className="flex flex-wrap gap-2">
              {providers.map(p => (
                <button
                  key={p.id}
                  onClick={() => toggleProvider(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.provider_chain.includes(p.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {form.provider_chain.includes(p.id) && (
                    <span className="mr-1 font-mono">{form.provider_chain.indexOf(p.id) + 1}.</span>
                  )}
                  {p.provider_name}
                </button>
              ))}
              {providers.length === 0 && (
                <p className="text-xs text-muted-foreground">No providers found. Create wallets first.</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? "Creating..." : "Create Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}