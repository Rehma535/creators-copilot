import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Youtube,
  Instagram,
  Music2,
  Star,
  Pencil,
  Trash2,
  Repeat2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type Platform = "YouTube" | "Instagram" | "TikTok";
type Item = {
  id: string;
  platform: Platform;
  topic: string;
  output: { text?: string };
  is_favorite: boolean;
  planned_date: string | null;
  created_at: string;
};

const PLATFORM_META: Record<Platform, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  YouTube: { icon: Youtube, color: "text-red-400" },
  Instagram: { icon: Instagram, color: "text-pink-400" },
  TikTok: { icon: Music2, color: "text-cyan" },
};

export function ContentCard({
  item,
  onRepurpose,
}: {
  item: Item;
  onRepurpose?: (id: string, target: Platform) => void | Promise<void>;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.output?.text ?? "");
  const Icon = PLATFORM_META[item.platform].icon;

  async function toggleFav() {
    await supabase
      .from("content_items")
      .update({ is_favorite: !item.is_favorite })
      .eq("id", item.id);
    qc.invalidateQueries();
  }

  async function del() {
    if (!confirm("Delete this content?")) return;
    await supabase.from("content_items").delete().eq("id", item.id);
    qc.invalidateQueries();
    toast.success("Deleted");
  }

  async function save() {
    await supabase
      .from("content_items")
      .update({ output: { text } })
      .eq("id", item.id);
    setEditing(false);
    qc.invalidateQueries();
    toast.success("Saved");
  }

  const others: Platform[] = (["YouTube", "Instagram", "TikTok"] as Platform[]).filter(
    (p) => p !== item.platform,
  );

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15">
            <Icon className={`h-5 w-5 ${PLATFORM_META[item.platform].color}`} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {item.platform} · {new Date(item.created_at).toLocaleDateString()}
            </p>
            <h3 className="font-semibold">{item.topic}</h3>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={toggleFav} aria-label="Favorite">
            <Star
              className={`h-4 w-4 ${item.is_favorite ? "fill-yellow-300 text-yellow-300" : "text-muted-foreground"}`}
            />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setEditing((v) => !v)} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={del} aria-label="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
          {onRepurpose && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="ml-1">
                  <Repeat2 className="h-4 w-4 mr-1.5" /> Repurpose
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {others.map((p) => (
                  <DropdownMenuItem key={p} onClick={() => onRepurpose(item.id, p)}>
                    to {p}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="mt-4">
        {editing ? (
          <div className="space-y-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-56 bg-input/60 font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setText(item.output?.text ?? ""); setEditing(false); }}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={save} className="gradient-primary text-white border-0">
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed font-sans max-h-[420px] overflow-auto">
            {item.output?.text || "(empty)"}
          </pre>
        )}
      </div>
    </div>
  );
}
