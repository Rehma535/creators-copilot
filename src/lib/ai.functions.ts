import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

async function callGemini(system: string, user: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI rate limit reached — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted — please add credits to continue.");
    throw new Error(`AI request failed [${res.status}]: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

type ProfileCtx = {
  channel_name: string | null;
  niche: string | null;
  target_audience: string | null;
  tone: string | null;
};

function buildSystemPrompt(profile: ProfileCtx, platform: string) {
  const parts = [
    `channel name: ${profile.channel_name || "unspecified"}`,
    `niche: ${profile.niche || "general"}`,
    `audience: ${profile.target_audience || "general audience"}`,
    `tone: ${profile.tone || "friendly"}`,
  ].join(", ");

  const perPlatform: Record<string, string> = {
    YouTube: "Return sections labeled: Title Options (5), Hook, Script Outline, Thumbnail Concepts (3), SEO Tags.",
    Instagram: "Return sections labeled: Caption, Carousel Outline (5-7 slides), CTA, Hashtags.",
    TikTok: "Return sections labeled: 30-Second Script, Hook, Caption, Trending Style Suggestion.",
  };

  return `You are a content strategist for a creator with this profile: ${parts}. Generate platform-specific content for ${platform}, writing in the creator's tone for their audience. ${perPlatform[platform] || ""} Use clear Markdown headings and lists. Be concise and actionable.`;
}

export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { platform: string; topic: string };
    if (!i?.platform || !i?.topic) throw new Error("platform and topic required");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("channel_name,niche,target_audience,tone")
      .eq("id", userId)
      .maybeSingle();
    const system = buildSystemPrompt((profile ?? {}) as ProfileCtx, data.platform);
    const output = await callGemini(system, `Topic: ${data.topic}`);
    const { data: inserted, error } = await supabase
      .from("content_items")
      .insert({
        user_id: userId,
        platform: data.platform as "YouTube" | "Instagram" | "TikTok",
        topic: data.topic,
        output: { text: output },
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const repurposeContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { source_id: string; target_platform: string };
    if (!i?.source_id || !i?.target_platform) throw new Error("source_id and target_platform required");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: source, error: se } = await supabase
      .from("content_items")
      .select("*")
      .eq("id", data.source_id)
      .eq("user_id", userId)
      .single();
    if (se || !source) throw new Error("Source content not found");
    const text = (source.output as { text?: string })?.text ?? "";
    const system = `You are a content strategist. Rewrite this ${source.platform} content as ${data.target_platform} content, adapting format and length to platform norms while preserving the core message. Use clear Markdown headings.`;
    const output = await callGemini(system, `Topic: ${source.topic}\n\nOriginal content:\n${text}`);
    const { data: inserted, error } = await supabase
      .from("content_items")
      .insert({
        user_id: userId,
        platform: data.target_platform as "YouTube" | "Instagram" | "TikTok",
        topic: source.topic,
        output: { text: output },
        source_id: source.id,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const autoScheduleSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: items } = await supabase
      .from("content_items")
      .select("id,platform,topic")
      .eq("user_id", userId)
      .is("planned_date", null)
      .order("created_at", { ascending: false })
      .limit(30);
    if (!items || items.length === 0) return { suggestions: [] };

    const system =
      "You are a social media scheduling assistant. Given a list of content items, suggest an optimal publishing schedule for the next 7 days based on general platform best practices, avoiding same-day overlaps per platform where possible. Return ONLY a JSON array of objects with fields: id (string), suggested_at (ISO 8601 datetime). No prose, no code fences.";
    const today = new Date().toISOString();
    const user = `Today: ${today}\nItems:\n${items
      .map((i) => `- id=${i.id} platform=${i.platform} topic="${i.topic}"`)
      .join("\n")}`;
    const raw = await callGemini(system, user);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    let parsed: Array<{ id: string; suggested_at: string }> = [];
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON array
      const m = cleaned.match(/\[[\s\S]*\]/);
      if (m) parsed = JSON.parse(m[0]);
    }
    const byId = new Map(items.map((i) => [i.id, i]));
    const suggestions = parsed
      .filter((s) => byId.has(s.id) && !isNaN(new Date(s.suggested_at).getTime()))
      .map((s) => ({ ...byId.get(s.id)!, suggested_at: s.suggested_at }));
    return { suggestions };
  });
