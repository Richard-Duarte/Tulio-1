import { createServerFn } from "@tanstack/react-start";
import type { Database } from "@/integrations/supabase/types";
import { DEFAULT_HERO_TITLE } from "@/lib/hero-copy";
import { carouselPhotos, siteParties, sitePhotos, siteVideos } from "@/lib/site-photos";

type Tables = Database["public"]["Tables"];

const tulioSettings = {
  artist_name: "Tulio",
  release_title: "Release",
  release_body: [
    "Túlio atua conectado à cultura underground, construindo experiências através de seus sets. Suas apresentações são desenvolvidas de forma progressiva, explorando tensão, atmosfera, groove e dinâmica para criar uma conexão contínua com a pista. Cada set é construído como uma narrativa, em que seleção musical, sensibilidade e leitura de pista conduzem a experiência do início ao fim.",
    "Sua identidade sonora tem o House como principal ponto de partida, mas se expande por diferentes vertentes e referências da música eletrônica. Essa amplitude faz parte de sua pesquisa musical e aparece de maneira fluida em seus sets, onde diferentes sonoridades, texturas e influências se encontram sem perder coerência. Mais do que se limitar a um gênero específico, sua seleção é guiada pela narrativa, pela energia e pelo momento da pista.",
    "Ao longo de sua trajetória, apresentou-se em diferentes cenários da música eletrônica brasileira, incluindo a pista Sinkrö do Festival Universo Paralello e o D-Edge, em São Paulo, além de performances em Fernando de Noronha e Jericoacoara.",
  ].join("\n\n"),
  logo_url: null,
  player_enabled: false,
  player_shuffle: false,
  sets_shuffle: false,
  instagram_url: "https://www.instagram.com/tulio.music/",
  soundcloud_url: "https://soundcloud.com/tuliomusic",
  spotify_url: null,
  youtube_url: null,
  bandcamp_url: null,
  booking_email: "soniccdrivebookings@gmail.com",
};

export const tulioHeroBody = tulioSettings.release_body;

export const tulioHomeDefaults = {
  section1_image_url: "/brand/tulio-session.jpg",
  section1_image_alt: "Tulio no set",
  section1_right_image_url: "/brand/tulio-booth.jpg",
  hero_title: DEFAULT_HERO_TITLE,
  hero_body: tulioHeroBody,
  hero_image_url: "/brand/tulio-n26.jpg",
  booking_email: "soniccdrivebookings@gmail.com",
  facebook_url: null as string | null,
  x_url: null as string | null,
  tiktok_url: null as string | null,
  youtube_url: null as string | null,
  soundcloud_url: "https://soundcloud.com/tuliomusic",
  bandcamp_url: null as string | null,
  instagram_url: "https://www.instagram.com/tulio.music/",
  spotify_url: null as string | null,
  beatport_url: null as string | null,
};

export const getTulioHome = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { publicSupabase } = await import("@/lib/supabase-public.server");
    const { data, error } = await publicSupabase()
      .from("tulio_home")
      .select(
        "section1_image_url, section1_image_alt, section1_right_image_url, hero_title, hero_body, hero_image_url, booking_email, facebook_url, x_url, tiktok_url, youtube_url, soundcloud_url, bandcamp_url, instagram_url, spotify_url, beatport_url",
      )
      .eq("singleton_key", "main")
      .maybeSingle();
    if (error || !data) return tulioHomeDefaults;
    return {
      ...tulioHomeDefaults,
      ...data,
      section1_image_url: data.section1_image_url || tulioHomeDefaults.section1_image_url,
      section1_image_alt: data.section1_image_alt || tulioHomeDefaults.section1_image_alt,
      section1_right_image_url: data.section1_right_image_url || tulioHomeDefaults.section1_right_image_url,
      hero_title: data.hero_title?.trim() || tulioHomeDefaults.hero_title,
      hero_body: data.hero_body || tulioHomeDefaults.hero_body,
      hero_image_url: data.hero_image_url || tulioHomeDefaults.hero_image_url,
      booking_email: data.booking_email || tulioHomeDefaults.booking_email,
    };
  } catch {
    return tulioHomeDefaults;
  }
});

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
    if (error || !data) return { ...tulioSettings, sets_description: null as string | null };
    // Separate query so a missing column (before ajustes.sql is applied) never breaks the settings.
    const extra = await publicSupabase()
      .from("site_settings")
      .select("sets_description" as "id")
      .limit(1)
      .maybeSingle();
    const sets_description =
      ((extra.data as unknown as { sets_description?: string | null } | null)?.sets_description ??
        null) as string | null;

    // The shared settings row still belongs to another artist. Keep Tulio's
    // public links and booking address on this site.
    return {
      ...tulioSettings,
      ...data,
      artist_name: tulioSettings.artist_name,
      release_title: tulioSettings.release_title,
      release_body: tulioSettings.release_body,
      instagram_url: tulioSettings.instagram_url,
      soundcloud_url: tulioSettings.soundcloud_url,
      spotify_url: tulioSettings.spotify_url,
      youtube_url: tulioSettings.youtube_url,
      bandcamp_url: tulioSettings.bandcamp_url,
      booking_email: tulioSettings.booking_email,
      sets_description,
    };
  } catch {
    return { ...tulioSettings, sets_description: null as string | null };
  }
});
const emptyMusic = () => ({
  sets: [] as Tables["sets"]["Row"][],
  releases: [] as Tables["releases"]["Row"][],
  links: [] as Tables["release_links"]["Row"][],
  tracks: [] as Tables["tracks"]["Row"][],
});

export const getPublicMusic = createServerFn({ method: "GET" }).handler(async () => {
  // A newly uploaded set must show (and play first) on the very next visit: never cache this.
  try {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", "no-store");
  } catch {
    /* not in a request context */
  }
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
const mediaColumns =
  "id, kind, title, public_url, poster_url, alt_text, downloadable, presskit_enabled, party_id, sort_order, captured_at, homepage_enabled, homepage_order";

function mapTulioMedia(row: {
  id: string;
  kind: string;
  title: string;
  public_url: string | null;
  poster_url: string | null;
  alt_text: string;
  downloadable: boolean;
  presskit_enabled: boolean;
  party_id: string | null;
  sort_order: number;
  captured_at: string | null;
  homepage_enabled: boolean;
  homepage_order: number;
}) {
  return {
    id: row.id,
    kind: row.kind === "video" ? ("video" as const) : ("image" as const),
    title: row.title,
    public_url: row.public_url,
    poster_url: row.poster_url,
    alt_text: row.alt_text,
    downloadable: row.downloadable,
    presskit_enabled: row.presskit_enabled,
    party_id: row.party_id,
    sort_order: row.sort_order,
    captured_at: row.captured_at,
    homepage: row.homepage_enabled,
    homepage_order: row.homepage_order,
  };
}

export const getPublicMedia = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { publicSupabase } = await import("@/lib/supabase-public.server");
    const { data, error } = await publicSupabase()
      .from("tulio_media")
      .select(mediaColumns)
      .eq("visible", true)
      .order("sort_order");
    if (error || !data?.length) return [...sitePhotos, ...siteVideos];
    return data.map(mapTulioMedia);
  } catch {
    return [...sitePhotos, ...siteVideos];
  }
});
export const getHomepageMedia = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { publicSupabase } = await import("@/lib/supabase-public.server");
    const { data, error } = await publicSupabase()
      .from("tulio_media")
      .select(mediaColumns)
      .eq("visible", true)
      .eq("homepage_enabled", true)
      .eq("kind", "image")
      .order("homepage_order");
    if (!error && data?.length) {
      return data.slice(0, 14).map((row, index) => ({ ...mapTulioMedia(row), sort_order: index }));
    }
  } catch {
    // The catalog below keeps the strip up if the table is unavailable.
  }
  const photos = carouselPhotos().map((photo) => ({
    id: photo.id,
    kind: "image" as const,
    title: photo.title,
    public_url: photo.public_url,
    poster_url: photo.poster_url,
    alt_text: photo.alt_text,
    sort_order: photo.homepage_order,
  }));
  const frames = siteVideos.map((video) => ({
    id: `${video.id}-frame`,
    kind: "image" as const,
    title: video.title,
    public_url: video.poster_url,
    poster_url: null,
    alt_text: video.alt_text,
    sort_order: video.sort_order,
  }));
  const mixed = [];
  for (let i = 0; mixed.length < 14 && (i < photos.length || i < frames.length); i++) {
    if (i < photos.length) mixed.push(photos[i]);
    if (mixed.length < 14 && i < frames.length) mixed.push(frames[i]);
  }
  return mixed.map((item, index) => ({ ...item, sort_order: index }));
});
export const getReleaseSections = createServerFn({ method: "GET" }).handler(async () => [
  {
    id: "tulio-bio",
    body: tulioSettings.release_body,
    image_url: null,
    sort_order: 0,
  },
]);
export const getParties = createServerFn({ method: "GET" }).handler(async () => siteParties);
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
