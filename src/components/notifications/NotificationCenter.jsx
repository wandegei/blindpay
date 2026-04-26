import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Bell, Check, CheckCheck, X,
  AlertTriangle, FileText, Shield,
  CreditCard, AlertCircle, Info
} from "lucide-react";
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

const severityDot = {
  info: "bg-blue-400",
  warning: "bg-yellow-400",
  critical: "bg-red-400"
};

export default function NotificationCenter() {
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // ✅ LOAD FROM SUPABASE
  async function load() {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_date", { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
      toast.error("Failed to load notifications");
      return;
    }

    setNotifs(data || []);
  }

  useEffect(() => {
    load();

    // ✅ REALTIME SUBSCRIPTION
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setNotifs(prev => [payload.new, ...prev]);
            toast(payload.new.title, { description: payload.new.message });
          }

          if (payload.eventType === "UPDATE") {
            setNotifs(prev =>
              prev.map(n => n.id === payload.new.id ? payload.new : n)
            );
          }

          if (payload.eventType === "DELETE") {
            setNotifs(prev =>
              prev.filter(n => n.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ✅ CLOSE ON OUTSIDE CLICK
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifs.filter(n => !n.read);

  // ✅ MARK SINGLE READ
  async function markRead(n) {
    const { error } = await supabase
      .from("notifications")
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .eq("id", n.id);

    if (error) {
      toast.error("Failed to update notification");
      return;
    }

    setNotifs(prev =>
      prev.map(x => x.id === n.id ? { ...x, read: true } : x)
    );
  }

  // ✅ MARK ALL READ
  async function markAllRead() {
    const unreadList = notifs.filter(n => !n.read);

    if (unreadList.length === 0) return;

    const ids = unreadList.map(n => n.id);

    const { error } = await supabase
      .from("notifications")
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .in("id", ids);

    if (error) {
      toast.error("Failed to mark all as read");
      return;
    }

    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
      >
        <Bell className="w-4 h-4 text-foreground" />

        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {/* PANEL */}
      {open && (
        <div className="absolute right-0 top-11 w-96 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          
          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Notifications</span>

              {unread.length > 0 && (
                <span className="text-[10px] font-bold bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full">
                  {unread.length} new
                </span>
              )}
            </div>

            <div className="flex gap-1">
              {unread.length > 0 && (
                <button onClick={markAllRead}>
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* LIST */}
          <div className="max-h-[420px] overflow-y-auto">
            {notifs.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                No notifications
              </div>
            )}

            {notifs.map(n => {
              const cfg = typeConfig[n.type] || typeConfig.system;
              const Icon = cfg.icon;

              return (
                <div key={n.id} className="flex gap-3 px-4 py-3 border-b">
                  
                  <div className={cn("w-8 h-8 flex items-center justify-center rounded", cfg.bg)}>
                    <Icon className={cfg.color} />
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="text-xs font-semibold">{n.title}</p>

                      {!n.read && (
                        <button onClick={() => markRead(n)}>
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {timeAgo(n.created_date)}
                    </p>
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