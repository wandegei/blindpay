import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Check, CheckCheck, X, AlertTriangle, FileText, Shield, CreditCard, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/helpers";
import { toast } from "sonner";

const typeConfig = {
  order_update: { icon: FileText,      color: "text-blue-400",    bg: "bg-blue-500/10" },
  dispute:      { icon: AlertTriangle, color: "text-red-400",     bg: "bg-red-500/10" },
  kyc_review:   { icon: Shield,        color: "text-purple-400",  bg: "bg-purple-500/10" },
  payment:      { icon: CreditCard,    color: "text-emerald-400", bg: "bg-emerald-500/10" },
  risk_flag:    { icon: AlertCircle,   color: "text-orange-400",  bg: "bg-orange-500/10" },
  system:       { icon: Info,          color: "text-muted-foreground", bg: "bg-secondary" },
};

const severityDot = { info: "bg-blue-400", warning: "bg-yellow-400", critical: "bg-red-400" };

export default function NotificationCenter() {
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  async function load() {
    const data = await base44.entities.Notification.list("-created_date", 50);
    setNotifs(data);
  }

  useEffect(() => {
    load();
    // Subscribe to real-time updates
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === "create") {
        setNotifs(prev => [event.data, ...prev]);
        toast(event.data.title, { description: event.data.message });
      } else if (event.type === "update") {
        setNotifs(prev => prev.map(n => n.id === event.id ? event.data : n));
      } else if (event.type === "delete") {
        setNotifs(prev => prev.filter(n => n.id !== event.id));
      }
    });
    return unsub;
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifs.filter(n => !n.read);

  async function markRead(n) {
    await base44.entities.Notification.update(n.id, { read: true, read_at: new Date().toISOString() });
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
  }

  async function markAllRead() {
    const unreadList = notifs.filter(n => !n.read);
    await Promise.all(unreadList.map(n =>
      base44.entities.Notification.update(n.id, { read: true, read_at: new Date().toISOString() })
    ));
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
      >
        <Bell className="w-4 h-4 text-foreground" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-11 w-96 bg-card border border-border rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden animate-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Notifications</span>
              {unread.length > 0 && (
                <span className="text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full">{unread.length} new</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread.length > 0 && (
                <button onClick={markAllRead} className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Mark all read">
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border/50">
            {notifs.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications</p>
              </div>
            )}
            {notifs.map(n => {
              const cfg = typeConfig[n.type] || typeConfig.system;
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3.5 transition-colors",
                    n.read ? "opacity-60" : "bg-primary/3 hover:bg-primary/5",
                    !n.read && "hover:bg-secondary/40"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", cfg.bg)}>
                    <Icon className={cn("w-4 h-4", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5", !n.read ? severityDot[n.severity] || "bg-blue-400" : "bg-transparent")} />
                        <p className="text-xs font-semibold text-foreground leading-snug">{n.title}</p>
                      </div>
                      {!n.read && (
                        <button onClick={() => markRead(n)} className="p-1 rounded hover:bg-secondary flex-shrink-0" title="Mark as read">
                          <Check className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.created_date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}