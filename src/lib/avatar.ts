import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; expires: number }>();

export async function getAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  cache.set(path, { url: data.signedUrl, expires: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
}
