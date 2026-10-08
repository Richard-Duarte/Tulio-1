import { createServerFn } from "@tanstack/react-start";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];

const tulioSettings = {
  artist_name: "Tulio",
  release_title: "Techno, glitch e metal.",
  release_body:
    "Tulio é um DJ de São Paulo. O set é techno, seco e noturno, com cortes glitch e uma marca construída em triângulos e no número 7.",
  logo_url: null,
  player_enabled: false,
  player_shuffle: false,
  sets_shuffle: false,
  instagram_url: null,
  soundcloud_url: null,
  spotify_url: null,
  youtube_url: null,
  bandcamp_url: null,
};

export const getSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { publicSupabase } = await import("@/lib/supabase-public.server");
    const { data, error } = await publicSupabase()
      .from("site_settings")
      .select(
        "artist_name, release_title, release_body, logo_url, player_enabled, player_shuffle, sets_shuffle, instagram_url, soundcloud_url, spotify_url, youtube_url, bandcamp_url",
      )
      .limit(1)
      .maybeSingle();
    if (error || !data) return tulioSettings;
    return { ...tulioSettings, ...data };
  } catch {
    return tulioSettings;
  }
});
const emptyMusic = () => ({
  sets: [] as Tables["sets"]["Row"][],
  releases: [] as Tables["releases"]["Row"][],
  links: [] as Tables["release_links"]["Row"][],
  tracks: [] as Tables["tracks"]["Row"][],
});

export const getPublicMusic = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { publicSupabase } = await import("@/lib/supabase-public.server");
    const db = publicSupabase();
    const [sets, releases, links, tracks] = await Promise.all([
      db.from("sets").select("*").eq("published", true).order("played_at", { ascending: true, nullsFirst: false }),
      db.from("releases").select("*").eq("published", true).order("sort_order", { ascending: true }),
      db.from("release_links").select("*").order("sort_order", { ascending: true }),
      db.from("tracks").select("*").eq("active", true).order("sort_order", { ascending: true }),
    ]);
    return {
      sets: sets.data ?? [],
      releases: releases.data ?? [],
      links: links.data ?? [],
      tracks: tracks.data ?? [],
    };
  } catch {
    return emptyMusic();
  }
});
export const getPublicMedia = createServerFn({ method: "GET" }).handler(
  async () => [] as Tables["media"]["Row"][],
);
export const getHomepageMedia = createServerFn({ method: "GET" }).handler(async () => {
  const { publicSupabase } = await import("@/lib/supabase-public.server");
  const { data, error } = await publicSupabase()
    .from("media")
    .select("id, kind, title, public_url, poster_url, alt_text, sort_order")
    .eq("visible", true)
    .eq("kind", "image")
    .not("public_url", "is", null)
    .order("sort_order", { ascending: true })
    .limit(24);
  if (error) throw error;
  return data ?? [];
});
export const getReleaseSections = createServerFn({ method: "GET" }).handler(async () => [
  {
    id: "tulio-bio",
    body: tulioSettings.release_body,
    image_url: null,
    sort_order: 0,
  },
]);
export const getParties = createServerFn({ method: "GET" }).handler(
  async () => [] as Pick<Tables["parties"]["Row"], "id" | "name" | "happened_at" | "sort_order">[],
);
export const getPublicLiveSets = createServerFn({ method: "GET" }).handler(
  async () =>
    [] as Pick<
      Tables["live_sets"]["Row"],
      | "id"
      | "title"
      | "description"
      | "cover_url"
      | "youtube_id"
      | "youtube_url"
      | "set_date"
      | "duration_seconds"
      | "created_at"
    >[],
);
