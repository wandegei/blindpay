import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
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
    const [{ data: w }, { data: t }] = await Promise.all([
      supabase.from("wallets").select("*").eq("provider_type", "provider"),
      supabase.from("transactions").select("*").order("created_date", { ascending: false }).limit(20),
    ]);

    setWallets(w || []);
    setTransactions(t || []);

    if (w?.length > 0 && !selectedWallet) setSelectedWallet(w[0]);

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
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold">BlindPay</span>
        </div>
        <Bell className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 rounded-2xl p-6">
        <p className="text-sm text-muted-foreground">Welcome,</p>
        <h2 className="text-xl font-bold">{selectedWallet?.provider_name || "Provider"}</h2>
        <p className="text-xs text-muted-foreground mt-3 mb-1">Available Credit</p>
        <p className="text-3xl font-extrabold font-mono">
          {formatCurrency(selectedWallet?.balance || 0, selectedWallet?.currency)}
        </p>
      </div>

      <Button onClick={() => setView(VIEWS.SPEND)} className="w-full h-14 text-lg font-extrabold bg-accent">
        Spend Credit
      </Button>

      <Button onClick={() => setView(VIEWS.WITHDRAW)} variant="outline" className="w-full h-12">
        Withdraw Funds
      </Button>

      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-sm font-semibold mb-4">Recent Activity</p>
        {myTxs.slice(0, 6).map(tx => {
          const isReceived = tx.to_provider === selectedWallet?.provider_name;
          return (
            <div key={tx.id} className="flex justify-between text-sm">
              <span>{isReceived ? "Received" : "Sent"}</span>
              <span>{formatCurrency(tx.amount)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========================= */
/* SPEND CREDIT */
/* ========================= */

function SpendCreditScreen({ wallet, providers, onBack, onDone }) {
  const [amount, setAmount] = useState("");
  const [toProvider, setToProvider] = useState(providers[0] || null);

  async function send() {
    const amt = parseFloat(amount);

    await supabase.from("transactions").insert([{
      tx_ref: generateRef("TRF"),
      type: "internal_transfer",
      from_wallet_id: wallet.id,
      to_wallet_id: toProvider.id,
      from_provider: wallet.provider_name,
      to_provider: toProvider.provider_name,
      amount: amt,
      currency: wallet.currency,
      status: "pending_approval",
    }]);

    await supabase.from("wallets").update({
      balance: wallet.balance - amt,
      locked_balance: (wallet.locked_balance || 0) + amt
    }).eq("id", wallet.id);

    toast.success("Transfer initiated");
    onDone();
  }

  return (
    <div>
      <button onClick={onBack}>Back</button>

      <Input value={amount} onChange={e => setAmount(e.target.value)} />

      {providers.map(p => (
        <button key={p.id} onClick={() => setToProvider(p)}>
          {p.provider_name}
        </button>
      ))}

      <Button onClick={send}>Send</Button>
    </div>
  );
}

/* ========================= */
/* WITHDRAW */
/* ========================= */

function WithdrawScreen({ wallet, onBack, onDone }) {
  const [method, setMethod] = useState("mtn_momo");

  async function withdraw() {
    await supabase.from("transactions").insert([{
      tx_ref: generateRef("PAY"),
      type: "payout",
      from_wallet_id: wallet.id,
      amount: wallet.balance,
      currency: wallet.currency,
      status: "pending_approval",
      notes: method,
    }]);

    await supabase.from("audit_logs").insert([{
      action: "payout_initiated",
      entity_type: "wallet",
      entity_id: wallet.id,
      details: JSON.stringify({ method })
    }]);

    toast.success("Withdrawal requested");
    onDone();
  }

  return (
    <div>
      <button onClick={onBack}>Back</button>
      <Button onClick={withdraw}>Withdraw</Button>
    </div>
  );
}