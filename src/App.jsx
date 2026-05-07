import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";

import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

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

const AdminRoute = ({ children }) => {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AuthenticatedApp = () => {
  const {
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    navigateToLogin,
  } = useAuth();

  // Show loading spinner while checking auth/public settings
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    }

    if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  // Main application routes
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/wallets" element={<Wallets />} />
        <Route path="/disputes" element={<Disputes />} />
        <Route path="/audit-log" element={<AuditLog />} />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />

        <Route path="/customer" element={<CustomerPortal />} />
        <Route path="/provider" element={<ProviderPortal />} />
        <Route path="/analytics" element={<Analytics />} />

        <Route
          path="/kyc"
          element={
            <AdminRoute>
              <KYC />
            </AdminRoute>
          }
        />

        {/* 404 Route */}
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthenticatedApp />
        </Router>

        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;