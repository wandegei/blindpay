import { Outlet, Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, FileText, ArrowLeftRight, Wallet, 
  Shield, AlertTriangle, ScrollText, Menu, X, UserCircle, Building2, ChevronRight,
  BarChart2, ShieldCheck
} from "lucide-react";
import { useState } from "react";
import NotificationCenter from "./notifications/NotificationCenter";
import { useAuth } from "@/lib/AuthContext";
import UserMenu from "./UserMenu";
import InactivityLock from "./InactivityLock";

const navGroups = [
  {
    label: "Operations",
    items: [
      { path: "/", label: "Dashboard", icon: LayoutDashboard },
      { path: "/orders", label: "Orders", icon: FileText },
      { path: "/transactions", label: "Transactions", icon: ArrowLeftRight },
      { path: "/wallets", label: "Wallets", icon: Wallet },
    ]
  },
  {
    label: "Risk & Compliance",
    items: [
      { path: "/disputes", label: "Disputes", icon: AlertTriangle },
      { path: "/audit-log", label: "Audit Log", icon: ScrollText },
      { path: "/admin", label: "Admin Panel", icon: Shield, adminOnly: true },
      { path: "/kyc", label: "KYC Verification", icon: ShieldCheck, adminOnly: true },
    ]
  },
  {
    label: "Insights",
    items: [
      { path: "/analytics", label: "Analytics", icon: BarChart2 },
    ]
  },
  {
    label: "Portals",
    items: [
      { path: "/customer", label: "Customer Portal", icon: UserCircle },
      { path: "/provider", label: "Provider Portal", icon: Building2 },
    ]
  }
];

export default function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <InactivityLock>
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border 
        flex flex-col transition-transform duration-300
        lg:translate-x-0 lg:static
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground tracking-tight">BlindPay</span>
              <span className="text-[10px] font-mono text-muted-foreground block -mt-1">ESCROW SYSTEM</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-5">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 mb-1.5">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.filter(item => !item.adminOnly || isAdmin).map(({ path, label, icon: Icon }) => {
                  const active = location.pathname === path ||
                    (path !== "/" && location.pathname.startsWith(path));
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                        ${
                          active
                            ? 'bg-primary/15 text-primary border border-primary/20'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{label}</span>
                      {active && <ChevronRight className="w-3 h-3 opacity-60" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user?.full_name || user?.email || "Guest"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email || "Not signed in"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-glow" />
            <span className="text-[10px] text-muted-foreground font-mono">SYSTEM ONLINE</span>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-border flex items-center px-4 lg:px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <button 
            className="lg:hidden mr-3 p-2 rounded-lg hover:bg-secondary" 
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                {user.role?.toUpperCase()} MODE
              </div>
            )}
            <NotificationCenter />
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
    </InactivityLock>
  );
}