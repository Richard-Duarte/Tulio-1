import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tables = z.enum([
  "sets",
  "live_sets",
  "releases",
  "tracks",
  "media",
  "parties",
  "release_sections",
  "release_links",
]);
const itemSchema = z.object({
  table: tables,
  item: z.record(z.unknown()),
});
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso negado.");
}
export const getAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [
      settings,
      sets,
      liveSets,
      releases,
      releaseLinks,
      tracks,
      media,
      parties,
      releaseSections,
    ] = await Promise.all([
      context.supabase.from("site_settings").select("*").eq("singleton_key", "main").single(),
      context.supabase.from("sets").select("*").order("sort_order"),
      context.supabase
        .from("live_sets")
        .select("*")
        .order("set_date", { nullsFirst: false })
        .order("created_at"),
      context.supabase.from("releases").select("*").order("sort_order"),
      context.supabase.from("release_links").select("*").order("sort_order"),
      context.supabase.from("tracks").select("*").order("sort_order"),
      context.supabase.from("media").select("*").order("sort_order"),
      context.supabase.from("parties").select("*").order("sort_order"),
      context.supabase.from("release_sections").select("*").order("sort_order"),
    ]);
    const error =
      settings.error ??
      sets.error ??
      liveSets.error ??
      releases.error ??
      releaseLinks.error ??
      tracks.error ??
      media.error ??
      parties.error ??
      releaseSections.error;
    if (error) throw error;
    return {
      settings: settings.data,
      sets: sets.data ?? [],
      live_sets: liveSets.data ?? [],
      releases: releases.data ?? [],
      release_links: releaseLinks.data ?? [],
      tracks: tracks.data ?? [],
      media: media.data ?? [],
      parties: parties.data ?? [],
      release_sections: releaseSections.data ?? [],
    };
  });
export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        release_title: z.string().min(1).max(120),
        release_body: z.string().min(1).max(10000),
        player_enabled: z.boolean(),
        player_shuffle: z.boolean(),
        sets_shuffle: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("site_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("singleton_key", "main");
    if (error) throw error;
    return { ok: true };
  });
const socialUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Link inválido.");
export const saveSocialLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        instagram_url: socialUrl,
        soundcloud_url: socialUrl,
        spotify_url: socialUrl,
        youtube_url: socialUrl,
        bandcamp_url: socialUrl,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const clean = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value === "" ? null : value]),
    );
    const { error } = await context.supabase
      .from("site_settings")
      .update({ ...clean, updated_at: new Date().toISOString() })
      .eq("singleton_key", "main");
    if (error) throw error;
    return { ok: true };
  });
export const saveAdminItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => itemSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const allowed: Record<typeof data.table, string[]> = {
      sets: [
        "id",
        "title",
        "description",
        "cover_url",
        "audio_url",
        "external_url",
        "soundcloud_url",
        "played_at",
        "duration_seconds",
        "sort_order",
        "published",
      ],
      live_sets: [
        "id",
        "title",
        "description",
        "cover_url",
        "youtube_url",
        "youtube_id",
        "set_date",
        "duration_seconds",
        "sort_order",
        "published",
      ],
      releases: [
        "id",
        "title",
        "description",
        "credits",
        "cover_url",
        "audio_url",
        "released_at",
        "download_enabled",
        "download_url",
        "sort_order",
        "published",
      ],
      tracks: ["id", "title", "artist", "cover_url", "audio_url", "sort_order", "active"],
      media: [
        "id",
        "kind",
        "title",
        "credit",
        "storage_bucket",
        "storage_path",
        "public_url",
        "poster_url",
        "alt_text",
        "sort_order",
        "visible",
        "presskit_enabled",
        "downloadable",
        "homepage_enabled",
        "party_id",
        "captured_at",
      ],
      parties: ["id", "name", "happened_at", "sort_order"],
      release_sections: ["id", "body", "image_url", "sort_order"],
      release_links: ["id", "release_id", "platform", "url", "sort_order"],
    };
    const clean = Object.fromEntries(
      Object.entries(data.item).filter(([key]) => allowed[data.table].includes(key)),
    );
    const { data: saved, error } = await context.supabase
      .from(data.table)
      .upsert(clean as never)
      .select()
      .single();
    if (error) throw error;
    return saved;
  });
export const deleteAdminItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ table: tables, id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from(data.table).delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const setPanelPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ password: z.string().min(4).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_secrets").upsert({
      key: "admin_panel_password",
      value: data.password,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { ok: true };
  });

export const setPresskitPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ password: z.string().min(4).max(80) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_secrets").upsert({
      key: "presskit_password",
      value: data.password,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { ok: true };
  });
