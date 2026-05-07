import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Wallet,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
import RecentActivityFeed from "../components/dashboard/RecentActivityFeed";
import PipelineOverview from "../components/dashboard/PipelineOverview";

import { formatCurrency, timeAgo } from "../lib/helpers";

export default function Dashboard() {
  const { isLoadingAuth, authError } = useAuth();

  /* ---------------- STATE ---------------- */

  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [disputes, setDisputes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);

  /* ---------------- LOAD DASHBOARD ---------------- */

  useEffect(() => {
    /*
      Wait for auth to finish loading first
    */
    if (isLoadingAuth) return;

    /*
      Handle auth errors properly
    */
    if (authError) {
      console.error("Auth Error:", authError);

      setDashboardError("Authentication failed");
      setLoading(false);

      return;
    }

    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setDashboardError(null);

        const [
          ordersResponse,
          transactionsResponse,
          walletsResponse,
          disputesResponse,
        ] = await Promise.all([
          supabase
            .from("orders")
            .select("*")
            .order("created_date", { ascending: false })
            .limit(50),

          supabase
            .from("transactions")
            .select("*")
            .order("created_date", { ascending: false })
            .limit(50),

          supabase
            .from("wallets")
            .select("*")
            .order("created_date", { ascending: false })
            .limit(50),

          supabase
            .from("disputes")
            .select("*")
            .order("created_date", { ascending: false })
            .limit(20),
        ]);

        /* ---------------- LOG ERRORS ---------------- */

        if (ordersResponse.error) {
          console.error("Orders Error:", ordersResponse.error);
        }

        if (transactionsResponse.error) {
          console.error(
            "Transactions Error:",
            transactionsResponse.error
          );
        }

        if (walletsResponse.error) {
          console.error("Wallets Error:", walletsResponse.error);
        }

        if (disputesResponse.error) {
          console.error("Disputes Error:", disputesResponse.error);
        }

        /*
          Stop if component unmounted
        */
        if (!mounted) return;

        /* ---------------- SET DATA ---------------- */

        setOrders(ordersResponse.data || []);
        setTransactions(transactionsResponse.data || []);
        setWallets(walletsResponse.data || []);
        setDisputes(disputesResponse.data || []);
      } catch (error) {
        console.error("Dashboard Load Error:", error);

        if (mounted) {
          setDashboardError(
            error?.message || "Failed to load dashboard"
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [isLoadingAuth, authError]);

  /* ---------------- DEBUG ---------------- */

  console.log({
    loading,
    isLoadingAuth,
    authError,
    dashboardError,
    ordersCount: orders.length,
    transactionsCount: transactions.length,
    walletsCount: wallets.length,
    disputesCount: disputes.length,
  });

  /* ---------------- LOADING UI ---------------- */

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />

        <div className="text-center">
          <p className="text-sm font-medium">
            Loading dashboard...
          </p>

          <p className="text-xs text-muted-foreground mt-1">
            Fetching live escrow data
          </p>
        </div>
      </div>
    );
  }

  /* ---------------- ERROR UI ---------------- */

  if (dashboardError) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-red-400 mb-2">
            Dashboard Error
          </h2>

          <p className="text-sm text-red-300">
            {dashboardError}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-lg bg-red-500 text-white text-sm"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- DERIVED DATA ---------------- */

  const activeOrders = orders.filter(
    (o) =>
      !["completed", "cancelled", "refunded"].includes(o?.status)
  );

  const pendingApprovals = transactions.filter(
    (t) => t?.status === "pending_approval"
  );

  const totalEscrow = wallets.reduce(
    (sum, wallet) => sum + Number(wallet?.locked_balance || 0),
    0
  );

  const totalAvailable = wallets.reduce(
    (sum, wallet) => sum + Number(wallet?.balance || 0),
    0
  );

  const openDisputes = disputes.filter((d) =>
    ["open", "under_review", "escalated"].includes(d?.status)
  );

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-7 animate-slide-in">
      {/* HEADER */}

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            Overview
          </p>

          <h1 className="text-3xl font-extrabold">
            Dashboard
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            BlindPay escrow system — real-time monitoring
          </p>
        </div>

        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />

          <span className="text-xs font-semibold text-emerald-400">
            All Systems Operational
          </span>
        </div>
      </div>

      {/* METRICS */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Orders"
          value={activeOrders.length}
          subtitle={`${orders.length} total`}
          icon={FileText}
        />

        <MetricCard
          title="Pending Approvals"
          value={pendingApprovals.length}
          subtitle="Needs action"
          icon={Clock}
        />

        <MetricCard
          title="Total in Escrow"
          value={formatCurrency(totalEscrow)}
          subtitle={`${formatCurrency(totalAvailable)} available`}
          icon={Wallet}
        />

        <MetricCard
          title="Open Disputes"
          value={openDisputes.length}
          subtitle={`${disputes.length} total`}
          icon={AlertTriangle}
        />
      </div>

      {/* PIPELINE + ACTIVITY */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PipelineOverview orders={orders} />
        </div>

        <div>
          <RecentActivityFeed
            transactions={transactions}
          />
        </div>
      </div>

      {/* PENDING APPROVAL ALERT */}

      {pendingApprovals.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-5 py-4 flex items-center gap-4">
          <Clock className="w-4 h-4 text-yellow-400" />

          <p className="text-sm font-semibold text-yellow-300">
            {pendingApprovals.length} pending approval(s)
          </p>

          <Link
            to="/transactions"
            className="ml-auto text-xs text-yellow-400"
          >
            Review{" "}
            <ArrowRight className="w-3 h-3 inline" />
          </Link>
        </div>
      )}

      {/* RECENT ORDERS */}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h2 className="text-sm font-semibold">
            Recent Orders
          </h2>

          <Link
            to="/orders"
            className="text-xs text-primary"
          >
            View all →
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            No orders found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left">Ref</th>
                <th className="px-6 py-3 text-left">
                  Customer
                </th>
                <th className="px-6 py-3 text-left">
                  Amount
                </th>
                <th className="px-6 py-3 text-left">
                  Status
                </th>
                <th className="px-6 py-3 text-left">Risk</th>
                <th className="px-6 py-3 text-left">
                  Created
                </th>
              </tr>
            </thead>

            <tbody>
              {orders.slice(0, 8).map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-border"
                >
                  <td className="px-6 py-4 font-mono text-xs">
                    {order.order_ref ||
                      order.id?.slice(0, 8)}
                  </td>

                  <td className="px-6 py-4">
                    {order.customer_name || "N/A"}
                  </td>

                  <td className="px-6 py-4">
                    {formatCurrency(
                      order.total_amount || 0
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <StatusBadge
                      status={order.status}
                    />
                  </td>

                  <td className="px-6 py-4">
                    {order.risk_score || 0}
                  </td>

                  <td className="px-6 py-4 text-xs">
                    {order.created_date
                      ? timeAgo(order.created_date)
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}