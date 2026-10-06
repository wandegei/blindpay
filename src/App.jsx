import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import PageNotFound from "./lib/PageNotFound";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Transactions from "./pages/Transactions";
import Wallets from "./pages/Wallets";
import Disputes from "./pages/Disputes";
import AuditLog from "./pages/AuditLog";
import AdminPanel from "./pages/AdminPanel";
import CustomerPortal from "./pages/CustomerPortal";
import ProviderPortal from "./pages/ProviderPortal";
import Analytics from "./pages/Analytics";
import KYC from "./pages/KYC";
import Login from "./pages/Login";

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function AuthenticatedApp() {
  const { isLoadingAuth } = useAuth();
  if (isLoadingAuth) {
    return <div className="fixed inset-0 grid place-items-center bg-background"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/wallets" element={<Wallets />} />
        <Route path="/disputes" element={<Disputes />} />
        <Route path="/audit-log" element={<AuditLog />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/customer" element={<CustomerPortal />} />
        <Route path="/provider" element={<ProviderPortal />} />
        <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route path="/kyc" element={<AdminRoute><KYC /></AdminRoute>} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}
