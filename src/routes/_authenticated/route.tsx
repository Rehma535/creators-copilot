import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getAvatarUrl } from "@/lib/avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  History,
  CalendarDays,
  UserCircle2,
  Sparkles,
  LogOut,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthLayout,
});

const NAV = [
  { to: "/dashboard", label: "Generate", icon: LayoutDashboard },
  { to: "/history", label: "History", icon: History },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/profile", label: "Profile", icon: UserCircle2 },
] as const;

function AuthLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [channelName, setChannelName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("channel_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        setChannelName(data?.channel_name ?? "");
        setAvatarUrl(await getAvatarUrl(data?.avatar_url));
      });
  }, [user, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  async function handleLogout() {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  const initials =
    (channelName || user.email || "?")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl">
        <Link to="/dashboard" className="flex items-center gap-2 px-6 py-6">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary neon-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold">Creator Copilot</span>
        </Link>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item) => {
            const active =
              pathname === item.to ||
              (item.to === "/dashboard" && pathname === "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "gradient-primary text-white shadow-[0_0_24px_-8px_rgba(168,85,247,0.7)]"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/60 backdrop-blur bg-background/60 sticky top-0 z-10">
          <Link to="/dashboard" className="flex items-center gap-2 md:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-lg gradient-primary">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold">Creator Copilot</span>
          </Link>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <Link to="/profile">
              <Avatar className="h-9 w-9 ring-2 ring-primary/50">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="avatar" />}
                <AvatarFallback className="gradient-primary text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-border bg-background/95 backdrop-blur px-2 py-2 flex justify-around">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Exit
          </button>
        </nav>

        <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
