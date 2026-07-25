import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ContentCard } from "@/components/content-card";
import { useServerFn } from "@tanstack/react-start";
import { repurposeContent } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "History — Creator Copilot" },
      { name: "description", content: "Your generated content history." },
    ],
  }),
  component: HistoryPage,
});

type Filter = "All" | "YouTube" | "Instagram" | "TikTok";

function HistoryPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("All");
  const [favOnly, setFavOnly] = useState(false);
  const repurposeFn = useServerFn(repurposeContent);
  const qc = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["history-items", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("content_items")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    return (items ?? []).filter(
      (i) => (filter === "All" || i.platform === filter) && (!favOnly || i.is_favorite),
    );
  }, [items, filter, favOnly]);

  async function handleRepurpose(id: string, target: "YouTube" | "Instagram" | "TikTok") {
    try {
      await repurposeFn({ data: { source_id: id, target_platform: target } });
      qc.invalidateQueries({ queryKey: ["history-items"] });
      toast.success(`Repurposed for ${target}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Repurpose failed");
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isEmpty = (items?.length ?? 0) === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-bold gradient-text">History</h1>
          <p className="text-muted-foreground mt-1">Everything you've made, in one place.</p>
        </div>
      </div>

      {isEmpty ? (
        <Link
          to="/generate"
          className="glass-card p-12 flex flex-col items-center justify-center text-center hover:border-primary/40 transition"
        >
          <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary neon-glow-hover mb-4">
            <Plus className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-semibold">Create New Project</h3>
          <p className="text-sm text-muted-foreground mt-1">Head to Generate to make your first piece.</p>
        </Link>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList className="bg-secondary/60 border border-border">
                {(["All", "YouTube", "Instagram", "TikTok"] as Filter[]).map((f) => (
                  <TabsTrigger
                    key={f}
                    value={f}
                    className="data-[state=active]:gradient-primary data-[state=active]:text-white"
                  >
                    {f}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button
              variant={favOnly ? "default" : "outline"}
              onClick={() => setFavOnly((v) => !v)}
              className={favOnly ? "gradient-primary text-white border-0" : ""}
            >
              <Star className={`h-4 w-4 mr-1.5 ${favOnly ? "fill-yellow-300 text-yellow-300" : ""}`} />
              Favorites
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="glass-card p-10 text-center text-muted-foreground">
              No content matches your filters.
            </div>
          ) : (
            <div className="grid gap-4">
              {filtered.map((it) => (
                <ContentCard key={it.id} item={it as any} onRepurpose={handleRepurpose} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
