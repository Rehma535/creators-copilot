import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getAvatarUrl } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Creator Copilot" },
      { name: "description", content: "Set up your creator profile so the AI writes in your voice." },
    ],
  }),
  component: ProfilePage,
});

const NICHES = ["Gaming", "Education", "Finance", "Fitness", "Travel", "Comedy", "Tech"] as const;
const TONES = ["Friendly", "Professional", "Humorous", "Bold", "Educational"] as const;

function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [niche, setNiche] = useState<string>("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState<string>("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        setChannelName(data?.channel_name ?? "");
        setNiche(data?.niche ?? "");
        setAudience(data?.target_audience ?? "");
        setTone(data?.tone ?? "");
        setAvatarPath(data?.avatar_url ?? null);
        setAvatarUrl(await getAvatarUrl(data?.avatar_url));
        setLoading(false);
      });
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          channel_name: channelName || null,
          niche: (niche || null) as never,
          target_audience: audience || null,
          tone: (tone || null) as never,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
    setAvatarPath(path);
    setAvatarUrl(await getAvatarUrl(path));
    toast.success("Avatar updated");
  }

  const initials = (channelName || user?.email || "?").slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold gradient-text">Your Creator Profile</h1>
        <p className="text-muted-foreground mt-2">
          The AI uses this to write in your voice for your audience.
        </p>
      </div>

      <div className="glass-card p-6 flex items-center gap-5">
        <Avatar className="h-20 w-20 ring-2 ring-primary/60">
          {avatarUrl && <AvatarImage src={avatarUrl} />}
          <AvatarFallback className="gradient-primary text-white text-xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">Profile picture</p>
          <p className="text-sm text-muted-foreground">PNG or JPG, shown across the app.</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatar} />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" /> Upload
        </Button>
      </div>

      <div className="glass-card p-6 space-y-5">
        <div className="space-y-1.5">
          <Label>Channel Name</Label>
          <Input
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            className="bg-input/60"
            placeholder="e.g. Neon Nights"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label>Niche</Label>
            <Select value={niche} onValueChange={setNiche}>
              <SelectTrigger className="bg-input/60"><SelectValue placeholder="Select a niche" /></SelectTrigger>
              <SelectContent>
                {NICHES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tone of Voice</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="bg-input/60"><SelectValue placeholder="Select a tone" /></SelectTrigger>
              <SelectContent>
                {TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Target Audience</Label>
          <Input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="bg-input/60"
            placeholder="e.g. Gen-Z gamers who love speedruns"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="gradient-primary text-white font-semibold neon-glow-hover border-0"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Save className="h-4 w-4 mr-2" /> Save profile</>)}
        </Button>
      </div>
    </div>
  );
}
