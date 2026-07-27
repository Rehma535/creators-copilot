import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const GEMINI_ENDPOINT = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

const LOVABLE_MODEL = "google/gemini-3.6-flash";
const OPENAI_MODEL = "gpt-4o-mini";
const GEMINI_MODEL = "gemini-2.0-flash";

type Provider = "lovable" | "gemini" | "openai";

function pickProvider(): { provider: Provider; key: string } {
  const lovable = process.env.LOVABLE_API_KEY?.trim();
  if (lovable) return { provider: "lovable", key: lovable };
  const gemini = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();
  if (gemini) return { provider: "gemini", key: gemini };
  const openai = process.env.OPENAI_API_KEY?.trim();
  if (openai) return { provider: "openai", key: openai };
  throw new Error(
    "No AI provider configured. Set LOVABLE_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in your deployment environment.",
  );
}

async function handleHttpError(res: Response): Promise<never> {
  const body = await res.text().catch(() => "");
  if (res.status === 401 || res.status === 403)
    throw new Error(`AI auth failed [${res.status}] — check your API key. ${body.slice(0, 200)}`);
  if (res.status === 429) throw new Error("AI rate limit reached — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted — please add credits to continue.");
  throw new Error(`AI request failed [${res.status}]: ${body.slice(0, 300)}`);
}

async function callGemini(system: string, user: string): Promise<string> {
  const { provider, key } = pickProvider();

  if (provider === "gemini") {
    const res = await fetch(GEMINI_ENDPOINT(GEMINI_MODEL, key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
      }),
    });
    if (!res.ok) await handleHttpError(res);
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  }

  const endpoint = provider === "lovable" ? LOVABLE_GATEWAY : OPENAI_ENDPOINT;
  const model = provider === "lovable" ? LOVABLE_MODEL : OPENAI_MODEL;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) await handleHttpError(res);
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
    YouTube:
      "Return these sections, each on its own line starting with the section name followed by a colon, then the content below it:\n\nTITLE OPTIONS:\n(5 numbered title options)\n\nHOOK:\n(the opening 10-15 seconds of narration, word-for-word)\n\nSCRIPT:\n(A complete, word-for-word spoken script the creator will read on camera. Break it into timestamped sections like [0:00-0:30], [0:30-1:15], etc. Each section contains the ACTUAL narration text — full sentences the creator says out loud — not bullet points or topic summaries. Aim for a 3-6 minute video length with natural spoken pacing.)\n\nTHUMBNAIL CONCEPTS:\n(3 numbered thumbnail ideas)\n\nSEO TAGS:\n(comma-separated tags)",
    Instagram:
      "Return these sections, each on its own line starting with the section name followed by a colon, then the content below it:\n\nCAPTION:\n(the full caption)\n\nCAROUSEL OUTLINE:\n(5-7 numbered slides with slide title and body copy)\n\nCTA:\n(one clear call to action)\n\nHASHTAGS:\n(space-separated hashtags)",
    TikTok:
      "Return these sections, each on its own line starting with the section name followed by a colon, then the content below it:\n\nHOOK:\n(the opening 3 seconds, word-for-word)\n\n30-SECOND SCRIPT:\n(complete word-for-word narration)\n\nCAPTION:\n(the caption text)\n\nTRENDING STYLE SUGGESTION:\n(format/sound/style recommendation)",
  };

  return `You are a content strategist for a creator with this profile: ${parts}. Generate platform-specific content for ${platform}, writing in the creator's tone for their audience. ${perPlatform[platform] || ""}\n\nCRITICAL FORMATTING RULES: Return CLEAN PLAIN TEXT ONLY. Do NOT use any Markdown syntax — no #, ##, ###, no **bold**, no *italic*, no backticks, no --- dividers, no > blockquotes. Do not wrap the response in code fences. Section labels should be plain uppercase text followed by a colon (e.g. "HOOK:"). The UI already renders each section in its own styled card, so formatting symbols are not needed.`;
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
    const system = `You are a content strategist. Rewrite this ${source.platform} content as ${data.target_platform} content, adapting format and length to platform norms while preserving the core message. Return CLEAN PLAIN TEXT ONLY — no Markdown syntax (no #, ##, **, *, backticks, --- dividers, or code fences). Use plain uppercase section labels ending in a colon (e.g. "HOOK:").`;
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
