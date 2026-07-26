import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { autoScheduleSuggestions } from "@/lib/ai.functions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Loader2,
  Youtube,
  Instagram,
  Music2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Creator Copilot" },
      { name: "description", content: "Plan your content across the week or month." },
    ],
  }),
  component: CalendarPage,
});

type View = "week" | "month" | "list";
type Item = {
  id: string;
  platform: "YouTube" | "Instagram" | "TikTok";
  topic: string;
  planned_date: string | null;
};

const PLATFORM_ICON = {
  YouTube: Youtube,
  Instagram: Instagram,
  TikTok: Music2,
} as const;

function CalendarPage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState<Date>(startOfDay(new Date()));
  const [assignDate, setAssignDate] = useState<Date | null>(null);
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<
    Array<{ id: string; platform: string; topic: string; suggested_at: string }>
  >([]);
  const qc = useQueryClient();
  const autoFn = useServerFn(autoScheduleSuggestions);

  const { data: items } = useQuery({
    queryKey: ["calendar-items", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("content_items")
        .select("id, platform, topic, planned_date")
        .eq("user_id", user!.id);
      return (data ?? []) as Item[];
    },
  });

  const planned = useMemo(() => (items ?? []).filter((i) => i.planned_date), [items]);
  const unplanned = useMemo(() => (items ?? []).filter((i) => !i.planned_date), [items]);

  async function assignItem(id: string, date: Date) {
    await supabase.from("content_items").update({ planned_date: date.toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["calendar-items"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    setAssignDate(null);
    toast.success("Scheduled");
  }

  async function unschedule(id: string) {
    await supabase.from("content_items").update({ planned_date: null }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["calendar-items"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  async function runAutoSchedule() {
    setAutoBusy(true);
    try {
      const res = await autoFn({});
      setSuggestions(res.suggestions);
      setAutoOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI schedule failed");
    } finally {
      setAutoBusy(false);
    }
  }

  async function acceptAll() {
    for (const s of suggestions) {
      await supabase
        .from("content_items")
        .update({ planned_date: new Date(s.suggested_at).toISOString() })
        .eq("id", s.id);
    }
    qc.invalidateQueries({ queryKey: ["calendar-items"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    setAutoOpen(false);
    setSuggestions([]);
    toast.success("Schedule accepted");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold gradient-text">Calendar</h1>
          <p className="text-muted-foreground mt-1">Plan when your content goes live.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            onClick={runAutoSchedule}
            disabled={autoBusy || unplanned.length === 0}
            className="gradient-primary text-white border-0 neon-glow-hover disabled:opacity-60 disabled:cursor-not-allowed"
            title={unplanned.length === 0 ? "No unscheduled content" : undefined}
          >
            {autoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Sparkles className="h-4 w-4 mr-2" /> Auto-Schedule Unplanned</>)}
          </Button>
          {unplanned.length === 0 && (
            <span className="text-xs text-muted-foreground">No unscheduled content</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList className="bg-secondary/60 border border-border">
            <TabsTrigger value="week" className="data-[state=active]:gradient-primary data-[state=active]:text-white">Weekly</TabsTrigger>
            <TabsTrigger value="month" className="data-[state=active]:gradient-primary data-[state=active]:text-white">Monthly</TabsTrigger>
            <TabsTrigger value="list" className="data-[state=active]:gradient-primary data-[state=active]:text-white">List</TabsTrigger>
          </TabsList>
        </Tabs>

        {view !== "list" && (
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => setCursor(view === "week" ? subDays(cursor, 7) : subMonths(cursor, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-40 text-center font-semibold">
              {view === "week"
                ? `${format(startOfWeek(cursor), "MMM d")} – ${format(endOfWeek(cursor), "MMM d, yyyy")}`
                : format(cursor, "MMMM yyyy")}
            </div>
            <Button size="icon" variant="outline" onClick={() => setCursor(view === "week" ? addDays(cursor, 7) : addMonths(cursor, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {view === "week" && <WeekView anchor={cursor} planned={planned} onAdd={setAssignDate} onUnschedule={unschedule} />}
      {view === "month" && <MonthView anchor={cursor} planned={planned} onAdd={setAssignDate} onUnschedule={unschedule} />}
      {view === "list" && <ListView planned={planned} onUnschedule={unschedule} />}

      <p className="text-xs text-muted-foreground italic">
        Auto-schedule uses best-practice AI suggestions — not real audience analytics.
      </p>

      {/* Assign dialog */}
      <Dialog open={!!assignDate} onOpenChange={(o) => !o && setAssignDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign content to {assignDate ? format(assignDate, "EEE, MMM d") : ""}
            </DialogTitle>
          </DialogHeader>
          {unplanned.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No unscheduled content. Head to Generate to make more.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {unplanned.map((i) => {
                const Icon = PLATFORM_ICON[i.platform];
                return (
                  <button
                    key={i.id}
                    onClick={() => assignItem(i.id, assignDate!)}
                    className="w-full text-left glass-panel rounded-xl p-3 hover:border-primary/50 flex items-center gap-3"
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{i.platform}</p>
                      <p className="font-medium truncate">{i.topic}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Auto-schedule preview */}
      <Dialog open={autoOpen} onOpenChange={setAutoOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Suggested schedule</DialogTitle>
          </DialogHeader>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              The AI didn't return valid suggestions. Try again with more items.
            </p>
          ) : (
            <>
              <div className="space-y-2 max-h-96 overflow-auto">
                {suggestions.map((s, idx) => (
                  <SuggestionRow
                    key={s.id}
                    suggestion={s}
                    onChange={(dt) => {
                      const next = [...suggestions];
                      next[idx] = { ...s, suggested_at: dt };
                      setSuggestions(next);
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => setAutoOpen(false)}>Cancel</Button>
                <Button onClick={acceptAll} className="gradient-primary text-white border-0">
                  Accept All
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SuggestionRow({
  suggestion,
  onChange,
}: {
  suggestion: { id: string; platform: string; topic: string; suggested_at: string };
  onChange: (dt: string) => void;
}) {
  const dt = new Date(suggestion.suggested_at);
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const Icon = PLATFORM_ICON[suggestion.platform as keyof typeof PLATFORM_ICON] ?? Sparkles;
  return (
    <div className="glass-panel rounded-xl p-3 flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{suggestion.platform}</p>
        <p className="font-medium truncate">{suggestion.topic}</p>
      </div>
      <input
        type="datetime-local"
        value={local}
        onChange={(e) => onChange(new Date(e.target.value).toISOString())}
        className="bg-input/70 border border-border rounded-lg px-3 py-1.5 text-sm"
      />
    </div>
  );
}

function DayCell({
  date,
  items,
  onAdd,
  onUnschedule,
  compact = false,
  muted = false,
}: {
  date: Date;
  items: Item[];
  onAdd: (d: Date) => void;
  onUnschedule: (id: string) => void;
  compact?: boolean;
  muted?: boolean;
}) {
  const dayItems = items.filter((i) => isSameDay(new Date(i.planned_date!), date));
  return (
    <div className={`glass-panel rounded-xl p-3 min-h-32 flex flex-col ${muted ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${isSameDay(date, new Date()) ? "text-primary" : ""}`}>
          {format(date, compact ? "d" : "EEE d")}
        </span>
        <button
          onClick={() => onAdd(date)}
          className="grid h-6 w-6 place-items-center rounded-md bg-primary/15 text-primary hover:bg-primary/25"
          aria-label="Add"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 space-y-1.5">
        {dayItems.map((i) => {
          const Icon = PLATFORM_ICON[i.platform];
          return (
            <div
              key={i.id}
              onClick={() => confirm("Remove from calendar?") && onUnschedule(i.id)}
              className="flex items-center gap-1.5 text-xs bg-primary/10 border border-primary/30 rounded-md px-2 py-1 cursor-pointer hover:bg-primary/20 truncate"
              title={i.topic}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{i.topic}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ anchor, planned, onAdd, onUnschedule }: {
  anchor: Date; planned: Item[]; onAdd: (d: Date) => void; onUnschedule: (id: string) => void;
}) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
      {days.map((d) => (
        <DayCell key={d.toISOString()} date={d} items={planned} onAdd={onAdd} onUnschedule={onUnschedule} />
      ))}
    </div>
  );
}

function MonthView({ anchor, planned, onAdd, onUnschedule }: {
  anchor: Date; planned: Item[]; onAdd: (d: Date) => void; onUnschedule: (id: string) => void;
}) {
  const start = startOfWeek(startOfMonth(anchor));
  const end = endOfWeek(endOfMonth(anchor));
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return (
    <div className="grid grid-cols-7 gap-2">
      {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((w) => (
        <div key={w} className="text-xs uppercase tracking-wider text-muted-foreground text-center py-1">{w}</div>
      ))}
      {days.map((d) => (
        <DayCell
          key={d.toISOString()}
          date={d}
          items={planned}
          onAdd={onAdd}
          onUnschedule={onUnschedule}
          compact
          muted={!isSameMonth(d, anchor)}
        />
      ))}
    </div>
  );
}

function ListView({ planned, onUnschedule }: { planned: Item[]; onUnschedule: (id: string) => void }) {
  const sorted = [...planned].sort((a, b) => +new Date(a.planned_date!) - +new Date(b.planned_date!));
  if (sorted.length === 0) {
    return <div className="glass-card p-10 text-center text-muted-foreground">Nothing scheduled yet.</div>;
  }
  return (
    <div className="space-y-2">
      {sorted.map((i) => {
        const Icon = PLATFORM_ICON[i.platform];
        return (
          <div key={i.id} className="glass-panel rounded-xl p-4 flex items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{i.platform}</p>
              <p className="font-medium truncate">{i.topic}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(i.planned_date!), "EEE, MMM d · h:mm a")}
            </div>
            <Button size="sm" variant="ghost" onClick={() => onUnschedule(i.id)}>
              Remove
            </Button>
          </div>
        );
      })}
    </div>
  );
}
