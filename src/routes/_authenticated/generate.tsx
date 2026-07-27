import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { generateContent, repurposeContent } from "@/lib/ai.functions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, MicOff, Wand2, Loader2, Repeat2, Youtube, Instagram, Music2 } from "lucide-react";
import { toast } from "sonner";
import { ContentCard } from "@/components/content-card";

export const Route = createFileRoute("/_authenticated/generate")({
  head: () => ({
    meta: [
      { title: "Generate — Creator Copilot" },
      { name: "description", content: "Generate AI-crafted content for YouTube, Instagram, and TikTok." },
    ],
  }),
  component: GeneratePage,
});

type Platform = "YouTube" | "Instagram" | "TikTok";

function GeneratePage() {
  const { user } = useAuth();
  const [platform, setPlatform] = useState<Platform>("YouTube");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const generateFn = useServerFn(generateContent);
  const repurposeFn = useServerFn(repurposeContent);
  const qc = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["generate-items", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("content_items")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  function toggleMic() {
    const SR =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;
    if (!SR) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let finalTranscript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setTopic((prev) => (prev ? `${prev.trim()} ${finalTranscript.trim()}` : finalTranscript.trim()));
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  }

  async function handleGenerate() {
    if (!topic.trim() || busy) return;
    setBusy(true);
    try {
      await generateFn({ data: { platform, topic: topic.trim() } });
      setTopic("");
      qc.invalidateQueries({ queryKey: ["generate-items"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["history-items"] });
      toast.success("Content generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setBusy(false);
    }
  }

  async function handleRepurpose(sourceId: string, target: Platform) {
    try {
      await repurposeFn({ data: { source_id: sourceId, target_platform: target } });
      qc.invalidateQueries({ queryKey: ["generate-items"] });
      qc.invalidateQueries({ queryKey: ["history-items"] });
      toast.success(`Repurposed for ${target}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Repurpose failed");
    }
  }

  const hasItems = (items?.length ?? 0) > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold gradient-text">Generate</h1>
        <p className="text-muted-foreground mt-2">Pick a platform, drop a topic, ship content.</p>
      </div>

      <div className="glass-card p-6 space-y-5">
        <Tabs value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
          <TabsList className="bg-secondary/60 border border-border">
            <TabsTrigger value="YouTube" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
              <Youtube className="h-4 w-4 mr-2" /> YouTube
            </TabsTrigger>
            <TabsTrigger value="Instagram" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
              <Instagram className="h-4 w-4 mr-2" /> Instagram
            </TabsTrigger>
            <TabsTrigger value="TikTok" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
              <Music2 className="h-4 w-4 mr-2" /> TikTok
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What do you want to make? e.g. 'A beginner's guide to speedrunning'"
            className="min-h-28 bg-input/60 pr-14 text-base"
          />
          <button
            type="button"
            onClick={toggleMic}
            className={`absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-xl transition ${
              listening
                ? "gradient-primary text-white animate-pulse neon-glow"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Toggle microphone"
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleGenerate}
            disabled={busy || !topic.trim()}
            className="gradient-primary text-white font-semibold neon-glow-hover border-0 h-11 px-6"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Wand2 className="h-4 w-4 mr-2" /> Generate</>)}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : hasItems ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Latest</h2>
          <div className="grid gap-4">
            {items!.map((it) => (
              <ContentCard key={it.id} item={it as any} onRepurpose={handleRepurpose} />
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl gradient-primary/20 bg-primary/10 mb-4">
            <Repeat2 className="h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground">Your generated content will appear here.</p>
        </div>
      )}
    </div>
  );
}
