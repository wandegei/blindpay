import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Bell, Lock, Shield, ArrowDownLeft, ArrowUpRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, generateRef } from "../lib/helpers";
import { toast } from "sonner";

const VIEWS = { HOME: "home", SPEND: "spend", WITHDRAW: "withdraw" };

export default function ProviderPortal() {
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(VIEWS.HOME);
  const [selectedWallet, setSelectedWallet] = useState(null);

  async function load() {
    const [w, t] = await Promise.all([
      base44.entities.Wallet.filter({ provider_type: "provider" }),
      base44.entities.Transaction.list("-created_date", 20),
    ]);
    setWallets(w);
    setTransactions(t);
    if (w.length > 0 && !selectedWallet) setSelectedWallet(w[0]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (view === VIEWS.SPEND) {
    return (
      <SpendCreditScreen
        wallet={selectedWallet}
        providers={wallets.filter(w => w.id !== selectedWallet?.id)}
        onBack={() => setView(VIEWS.HOME)}
        onDone={() => { load(); setView(VIEWS.HOME); }}
      />
    );
  }

  if (view === VIEWS.WITHDRAW) {
    return (
      <WithdrawScreen
        wallet={selectedWallet}
        onBack={() => setView(VIEWS.HOME)}
        onDone={() => { load(); setView(VIEWS.HOME); }}
      />
    );
  }

  const myTxs = transactions.filter(t =>
    t.from_provider === selectedWallet?.provider_name ||
    t.to_provider === selectedWallet?.provider_name
  );

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold">BlindPay</span>
        </div>
        <Bell className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Welcome + credit */}
      <div className="bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 rounded-2xl p-6">
        <p className="text-sm text-muted-foreground">Welcome,</p>
        <h2 className="text-xl font-bold">{selectedWallet?.provider_name || "Provider"}</h2>
        <p className="text-xs text-muted-foreground mt-3 mb-1">Available Credit</p>
        <div className="flex items-center gap-3">
          <p className="text-3xl font-extrabold font-mono">{formatCurrency(selectedWallet?.balance || 0, selectedWallet?.currency)}</p>
          <span className="text-[10px] font-bold bg-accent/20 text-accent border border-accent/30 px-2 py-0.5 rounded-full">NEW</span>
        </div>
      </div>

      {/* Spend Credit CTA */}
      <Button
        onClick={() => setView(VIEWS.SPEND)}
        className="w-full h-14 text-lg font-extrabold bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        Spend Credit
      </Button>

      {/* Withdraw Button */}
      <Button
        onClick={() => setView(VIEWS.WITHDRAW)}
        variant="outline"
        className="w-full h-12 text-sm font-bold gap-2"
      >
        <ArrowUpRight className="w-4 h-4" /> Withdraw Funds
      </Button>

      {/* Wallet selector */}
      {wallets.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Switch Provider</p>
          <div className="flex gap-2 flex-wrap">
            {wallets.map(w => (
              <button
                key={w.id}
                onClick={() => setSelectedWallet(w)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedWallet?.id === w.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {w.provider_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-sm font-semibold mb-4">Recent Activity</p>
        <div className="space-y-3">
          {myTxs.slice(0, 6).map(tx => {
            const isReceived = tx.to_provider === selectedWallet?.provider_name;
            return (
              <div key={tx.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isReceived ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                  {isReceived
                    ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                    : <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />
                  }
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold">{isReceived ? "Received Credit" : "Sent Credit"}</p>
                  <p className="text-[10px] text-muted-foreground">{tx.from_provider || "External"} → {tx.to_provider || "External"}</p>
                </div>
                <span className={`text-xs font-mono font-bold ${isReceived ? "text-emerald-400" : "text-red-400"}`}>
                  {isReceived ? "+" : "-"}{formatCurrency(tx.amount, tx.currency)}
                </span>
              </div>
            );
          })}
          {myTxs.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" /> Privacy Transaction
      </div>
    </div>
  );
}

function SpendCreditScreen({ wallet, providers, onBack, onDone }) {
  const [amount, setAmount] = useState("");
  const [toProvider, setToProvider] = useState(providers[0] || null);
  const [sending, setSending] = useState(false);

  async function send() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!toProvider) { toast.error("Select a provider"); return; }
    if (amt > (wallet?.balance || 0)) { toast.error("Insufficient balance"); return; }
    setSending(true);

    await base44.entities.Transaction.create({
      tx_ref: generateRef("TRF"),
      order_id: "manual",
      type: "internal_transfer",
      from_wallet_id: wallet.id,
      to_wallet_id: toProvider.id,
      from_provider: wallet.provider_name,
      to_provider: toProvider.provider_name,
      amount: amt,
      currency: wallet.currency,
      status: "pending_approval",
      approval_required_from: "admin",
    });

    await base44.entities.Wallet.update(wallet.id, {
      locked_balance: (wallet.locked_balance || 0) + amt,
      balance: (wallet.balance || 0) - amt,
    });

    toast.success("Credit transfer initiated — pending approval");
    setSending(false);
    onDone();
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between py-2">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <span className="font-bold">Spend Credit</span>
        <div />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div>
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Amount</Label>
          <div className="relative mt-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">{wallet?.currency}</span>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="pl-14 h-14 text-xl font-bold font-mono bg-secondary border-0"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Send To</Label>
          <div className="space-y-2 mt-2">
            {providers.map(p => (
              <button
                key={p.id}
                onClick={() => setToProvider(p)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${
                  toProvider?.id === p.id ? "border-primary bg-primary/10" : "border-border bg-secondary/50 hover:border-primary/40"
                }`}
              >
                <span className="font-medium text-sm">{p.provider_name}</span>
                <span className="text-xs font-mono text-muted-foreground">
                  Available: {formatCurrency(p.balance || 0, p.currency)}
                </span>
              </button>
            ))}
            {providers.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No other providers available</p>
            )}
          </div>
        </div>

        <Button
          onClick={send}
          disabled={sending || !amount || !toProvider}
          className="w-full h-12 text-base font-bold gap-2"
        >
          <Send className="w-4 h-4" /> SEND CREDIT
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" /> Privacy Protected
      </div>
    </div>
  );
}

function WithdrawScreen({ wallet, onBack, onDone }) {
  const [method, setMethod] = useState("mtn_momo");
  const [withdrawing, setWithdrawing] = useState(false);

  async function withdraw() {
    if (!wallet?.balance || wallet.balance <= 0) { toast.error("No available balance"); return; }
    setWithdrawing(true);

    await base44.entities.Transaction.create({
      tx_ref: generateRef("PAY"),
      order_id: "withdrawal",
      type: "payout",
      from_wallet_id: wallet.id,
      from_provider: wallet.provider_name,
      amount: wallet.balance,
      currency: wallet.currency,
      status: "pending_approval",
      approval_required_from: "admin",
      notes: `Withdrawal via ${method}`,
    });

    await base44.entities.AuditLog.create({
      action: "payout_initiated", entity_type: "wallet", entity_id: wallet.id,
      actor_email: wallet.provider_email || "provider", actor_role: "provider",
      details: JSON.stringify({ method, amount: wallet.balance }),
    });

    toast.success("Withdrawal requested — pending admin approval");
    setWithdrawing(false);
    onDone();
  }

  const methodOptions = [
    { value: "mtn_momo", label: "MTN Mobile Money" },
    { value: "airtel_money", label: "Airtel Money" },
    { value: "bank_transfer", label: "Bank Transfer" },
  ];

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between py-2">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <span className="font-bold">Withdraw Funds</span>
        <div />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Available</p>
          <p className="text-3xl font-extrabold font-mono mt-1 text-foreground">
            {formatCurrency(wallet?.balance || 0, wallet?.currency)}
          </p>
        </div>

        <div>
          <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-3 block">Select Method</Label>
          <div className="space-y-2">
            {methodOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setMethod(opt.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-sm font-medium ${
                  method === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 hover:border-primary/40"
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  method === opt.value ? "border-primary" : "border-muted-foreground"
                }`}>
                  {method === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={withdraw}
          disabled={withdrawing}
          className="w-full h-12 text-base font-bold"
        >
          WITHDRAW
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" /> Privacy Protected
      </div>
    </div>
  );
}