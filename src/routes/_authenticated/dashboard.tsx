import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Calendar as CalIcon, TrendingUp, Wand2, History as HistoryIcon } from "lucide-react";
import studioImg from "@/assets/studio.jpg";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Creator Copilot" },
      { name: "description", content: "Your content stats and quick actions." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;
      const [total, scheduled] = await Promise.all([
        supabase.from("content_items").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase
          .from("content_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
          .not("planned_date", "is", null),
      ]);
      const totalCount = total.count ?? 0;
      const scheduledCount = scheduled.count ?? 0;
      // Est. reach heuristic (not real analytics): 250 reach per generated item
      const estReach = totalCount * 250;
      return { totalCount, scheduledCount, estReach };
    },
  });

  const isNew = (stats?.totalCount ?? 0) === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-border">
        <img
          src={studioImg}
          alt="Content creator studio setup with ring light, monitors, and camera gear"
          className="h-64 md:h-80 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/85 to-background/30" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <p className="text-sm text-muted-foreground">
            {isNew ? "Let's make your first post." : "Here's your creator overview."}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mt-1 drop-shadow-[0_2px_20px_rgba(168,85,247,0.35)]">
            {isNew ? "Welcome Aboard" : "Welcome Back"}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Content" value={stats?.totalCount ?? 0} icon={Sparkles} />
        <StatCard label="Posts Scheduled" value={stats?.scheduledCount ?? 0} icon={CalIcon} />
        <StatCard label="Est. Reach" value={stats?.estReach ?? 0} icon={TrendingUp} hint="Best-practice estimate" />
      </div>

      <div className="glass-card p-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Generate new content</h2>
            <p className="text-muted-foreground mt-1">
              Pick a platform and topic — your AI copilot handles the rest.
            </p>
          </div>
          <Link
            to="/generate"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 gradient-primary text-white font-semibold neon-glow-hover"
          >
            <Wand2 className="h-4 w-4" /> Start generating
          </Link>
        </div>
      </div>

      {!isNew && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Recent activity</h3>
              <p className="text-sm text-muted-foreground">See everything in History.</p>
            </div>
            <Link to="/history" className="inline-flex items-center gap-2 text-sm text-cyan hover:underline">
              <HistoryIcon className="h-4 w-4" /> Open History
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary/20 bg-primary/15">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold gradient-text">{value.toLocaleString()}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
