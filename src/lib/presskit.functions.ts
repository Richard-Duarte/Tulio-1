import { createHash, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
// `useSession` is an h3 server utility, not a React hook; alias it to avoid confusion.
import { setResponseHeader, useSession as getSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { isPresskitCatalogItem, type GalleryParty } from "@/lib/gallery-groups";
import { parsePresskitRider } from "@/lib/presskit-rider";
import { resolveVideoPosterUrl } from "@/lib/video-poster";
import { isEmbedVideo } from "@/lib/media-external";
import { siteParties } from "@/lib/site-photos";
import { PRESSKIT_SESSION_COOKIE } from "@/lib/tulio-storage-keys";

const SESSION_MAX_AGE = 60 * 60 * 12;

function sessionConfig() {
  return {
    password: process.env["PRESSKIT_SESSION_SECRET"]!,
    name: PRESSKIT_SESSION_COOKIE,
    maxAge: SESSION_MAX_AGE,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    },
  };
}

type PresskitSession = { unlocked?: boolean };

const digest = (value: string) => createHash("sha256").update(value).digest();
const match = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

/** Session-backed responses must never be cached or replayed by intermediaries. */
function noStore() {
  setResponseHeader("Cache-Control", "private, no-store");
  setResponseHeader("Vary", "Cookie");
}

/** Reads the signed (sealed) presskit session cookie on the server. */
async function hasPresskitAccess() {
  if (!process.env["PRESSKIT_SESSION_SECRET"]) return false;
  return Boolean((await getSession<PresskitSession>(sessionConfig())).data.unlocked);
}

export const getPresskitAccess = createServerFn({ method: "GET" }).handler(async () => {
  noStore();
  return hasPresskitAccess();
});

export type PresskitMedia = {
  id: string;
  kind: "image" | "video" | "audio";
  title: string;
  public_url: string | null;
  poster_url: string | null;
  alt_text: string;
  downloadable: boolean;
  presskit_enabled: boolean;
  presskit_studio_enabled?: boolean;
  party_id?: string | null;
  captured_at?: string | null;
  sort_order?: number;
  source_type?: string | null;
  external_provider?: string | null;
  external_id?: string | null;
  embed_url?: string | null;
};

export type PresskitContent =
  | { unlocked: false }
  | {
      unlocked: true;
      media: PresskitMedia[];
      parties: GalleryParty[];
      /** Technical rider: each line lists interchangeable equipment options. */
      rider: string[][];
    };

async function loadPresskitRider(supabase: { from: (t: string) => any }) {
  const { data } = await supabase
    .from("site_settings")
    .select("presskit_rider")
    .eq("singleton_key", "main")
    .maybeSingle();
  return parsePresskitRider((data as { presskit_rider?: unknown } | null)?.presskit_rider);
}

function mapPresskitRow(row: {
  id: string;
  kind: string;
  title: string;
  public_url: string | null;
  poster_url: string | null;
  alt_text: string;
  downloadable: boolean;
  presskit_enabled: boolean;
  presskit_studio_enabled: boolean;
  party_id: string | null;
  captured_at: string | null;
  sort_order: number;
  source_type?: string | null;
  external_provider?: string | null;
  external_id?: string | null;
  embed_url?: string | null;
}): PresskitMedia | null {
  if (!row.presskit_enabled) return null;
  const kind = row.kind === "video" ? "video" : row.kind === "image" ? "image" : null;
  if (!kind) return null;
  const external = {
    source_type: row.source_type ?? "storage",
    external_provider: row.external_provider,
    external_id: row.external_id,
    embed_url: row.embed_url,
  };
  const playable =
    Boolean(row.public_url) ||
    (kind === "video" && isEmbedVideo({ kind: "video", ...external }));
  if (!playable) return null;
  return {
    id: row.id,
    kind,
    title: row.title,
    public_url: row.public_url,
    poster_url: resolveVideoPosterUrl(row) ?? row.poster_url,
    alt_text: row.alt_text,
    downloadable: row.downloadable,
    presskit_enabled: row.presskit_enabled,
    presskit_studio_enabled: row.presskit_enabled && row.presskit_studio_enabled,
    party_id: row.party_id,
    captured_at: row.captured_at,
    sort_order: row.sort_order,
    ...external,
  };
}

async function loadPresskitParties(supabase: { from: (t: string) => any }) {
  const builtIn = siteParties.map(({ id, name, happened_at }) => ({ id, name, happened_at }));
  const { data } = await supabase
    .from("parties")
    .select("id, name, happened_at")
    .order("happened_at", { ascending: false, nullsFirst: false });
  return [...builtIn, ...(data ?? [])] as GalleryParty[];
}

/**
 * Protected presskit content. Only returned after verifying the unlock session
 * cookie server-side; the locked response carries no media URLs or metadata.
 */
export const getPresskitContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<PresskitContent> => {
    noStore();
    if (!(await hasPresskitAccess())) return { unlocked: false };
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [mediaRes, parties, rider] = await Promise.all([
        supabaseAdmin
          .from("tulio_media")
          .select(
            "id, kind, title, public_url, poster_url, alt_text, downloadable, presskit_enabled, presskit_studio_enabled, party_id, sort_order, captured_at, source_type, external_provider, external_id, embed_url",
          )
          .eq("presskit_enabled", true)
          .order("captured_at", { ascending: false, nullsFirst: false })
          .order("sort_order", { ascending: false }),
        loadPresskitParties(supabaseAdmin),
        loadPresskitRider(supabaseAdmin),
      ]);
      const media = (mediaRes.data ?? [])
        .map(mapPresskitRow)
        .filter((row): row is PresskitMedia => row !== null && isPresskitCatalogItem(row));
      return { unlocked: true, media, parties, rider };
    } catch {
      return { unlocked: true, media: [], parties: siteParties, rider: parsePresskitRider(null) };
    }
  },
);

export const unlockPresskit = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ password: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data }) => {
    noStore();
    let storedValue: string | undefined;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: stored } = await supabaseAdmin
        .from("app_secrets")
        .select("value")
        .eq("key", "presskit_password")
        .maybeSingle();
      storedValue = stored?.value;
    } catch {
      storedValue = undefined;
    }
    const expected = storedValue ?? process.env["PRESSKIT_PASSWORD"];
    if (!expected || !match(data.password, expected)) return { ok: false as const };
    const session = await getSession<PresskitSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });