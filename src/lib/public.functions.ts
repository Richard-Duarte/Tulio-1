import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Conteúdo temporariamente indisponível.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
          headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const getSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("site_settings")
    .select(
      "artist_name,release_title,release_body,logo_url,player_enabled,player_shuffle,sets_shuffle,instagram_url,soundcloud_url,spotify_url,youtube_url,bandcamp_url",
    )
    .eq("singleton_key", "main")
    .single();
  if (error) throw error;
  return data;
});
export const getPublicMusic = createServerFn({ method: "GET" }).handler(async () => {
  const client = publicClient();
  const [sets, releases, links, tracks] = await Promise.all([
    client.from("sets").select("*").eq("published", true).order("sort_order"),
    client.from("releases").select("*").eq("published", true).order("sort_order"),
    client.from("release_links").select("*").order("sort_order"),
    client.from("tracks").select("*").eq("active", true).order("sort_order"),
  ]);
  const error = sets.error ?? releases.error ?? links.error ?? tracks.error;
  if (error) throw error;
  return {
    sets: sets.data ?? [],
    releases: releases.data ?? [],
    links: links.data ?? [],
    tracks: tracks.data ?? [],
  };
});
export const getPublicMedia = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("media")
    .select(
      "id,kind,title,credit,public_url,poster_url,alt_text,sort_order,presskit_enabled,downloadable,homepage_enabled,party_id",
    )
    .eq("visible", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
});
export const getHomepageMedia = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("media")
    .select("id,kind,title,public_url,poster_url,alt_text,sort_order")
    .eq("homepage_enabled", true)
    .in("kind", ["image", "video"])
    .not("public_url", "is", null)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
});
export const getReleaseSections = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("release_sections")
    .select("id,body,image_url,sort_order")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
});
export const getParties = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("parties")
    .select("id,name,happened_at,sort_order")
    .order("sort_order")
    .order("happened_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});
// Live Sets (YouTube videos), oldest -> newest, undated last.
export const getPublicLiveSets = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("live_sets")
    .select(
      "id,title,description,cover_url,youtube_id,youtube_url,set_date,duration_seconds,created_at",
    )
    .eq("published", true)
    .order("set_date", { nullsFirst: false })
    .order("created_at");
  if (error) throw error;
  return data ?? [];
});
