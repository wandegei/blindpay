import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Lock } from "lucide-react";

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const WARN_BEFORE_MS = 60 * 1000; // warn 1 minute before

export default function InactivityLock({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [locked, setLocked] = useState(false);
  const [warning, setWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const lockTimer = useRef(null);
  const warnTimer = useRef(null);
  const countdownInterval = useRef(null);

  const resetTimers = useCallback(() => {
    if (!isAuthenticated) return;
    clearTimeout(lockTimer.current);
    clearTimeout(warnTimer.current);
    clearInterval(countdownInterval.current);
    setWarning(false);
    setCountdown(60);

    warnTimer.current = setTimeout(() => {
      setWarning(true);
      setCountdown(60);
      countdownInterval.current = setInterval(() => {
        setCountdown(c => c - 1);
      }, 1000);
    }, INACTIVITY_TIMEOUT_MS - WARN_BEFORE_MS);

    lockTimer.current = setTimeout(() => {
      clearInterval(countdownInterval.current);
      setLocked(true);
      setWarning(false);
    }, INACTIVITY_TIMEOUT_MS);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach(e => window.addEventListener(e, resetTimers, { passive: true }));
    resetTimers();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimers));
      clearTimeout(lockTimer.current);
      clearTimeout(warnTimer.current);
      clearInterval(countdownInterval.current);
    };
  }, [isAuthenticated, resetTimers]);

  const handleUnlock = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  if (locked) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Session Locked</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your session was locked due to inactivity.
            </p>
            {user && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">{user.email}</p>
            )}
          </div>
          <button
            onClick={handleUnlock}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Sign In Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {warning && (
        <div className="fixed bottom-4 right-4 z-50 bg-warning/10 border border-warning/30 text-warning rounded-xl px-4 py-3 text-sm font-medium shadow-lg flex items-center gap-3 animate-slide-in">
          <Lock className="w-4 h-4 flex-shrink-0" />
          Session locks in <span className="font-mono font-bold">{countdown}s</span> due to inactivity
        </div>
      )}
      {children}
    </>
  );
}