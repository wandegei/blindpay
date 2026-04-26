import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle, LogOut, LogIn, User, ShieldCheck } from "lucide-react";

export default function UserMenu() {
  const { user, isAuthenticated } = useAuth();

  // 🔐 Supabase login (redirect to your login page)
  const handleLogin = () => {
    window.location.href = "/login"; // adjust if needed
  };

  // 🔓 Supabase logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/30 transition-colors outline-none">
          <UserCircle className="w-4 h-4 text-primary" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {isAuthenticated && user ? (
          <>
            <div className="px-3 py-2.5 space-y-0.5">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-sm font-semibold truncate">
                  {user.full_name || "User"}
                </p>
              </div>

              <p className="text-xs text-muted-foreground truncate pl-5">
                {user.email}
              </p>

              <div className="flex items-center gap-1.5 pl-5 mt-1">
                <ShieldCheck className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-mono text-primary uppercase">
                  {user.role}
                </span>
              </div>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            onClick={handleLogin}
            className="gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}