import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isSavedPartyId } from "@/lib/gallery-groups";
import { defaultPresskitLogoVariants } from "@/lib/presskit-logo-variants";
import { DEFAULT_SOCIAL_ORDER, normalizeSocialOrder, type SocialKey } from "@/lib/social-order";

const tables = z.enum([
  "sets",
  "live_sets",
  "releases",
  "tracks",
  "media",
  "tulio_media",
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
      home,
      sets,
      liveSets,
      releases,
      releaseLinks,
      media,
      parties,
      releaseSections,
    ] = await Promise.all([
      context.supabase.from("site_settings").select("*").eq("singleton_key", "main").single(),
      context.supabase.from("tulio_home").select("*").eq("singleton_key", "main").maybeSingle(),
      context.supabase.from("sets").select("*").order("sort_order"),
      context.supabase
        .from("live_sets")
        .select("*")
        .order("set_date", { nullsFirst: false })
        .order("created_at"),
      context.supabase.from("releases").select("*").order("sort_order"),
      context.supabase.from("release_links").select("*").order("sort_order"),
      context.supabase.from("tulio_media").select("*").order("sort_order"),
      context.supabase.from("parties").select("*").order("sort_order"),
      context.supabase.from("release_sections").select("*").order("sort_order"),
    ]);
    const error =
      settings.error ??
      home.error ??
      sets.error ??
      liveSets.error ??
      releases.error ??
      releaseLinks.error ??
      media.error ??
      parties.error ??
      releaseSections.error;
    if (error) throw error;
    return {
      settings: settings.data ?? {},
      home: home.data,
      sets: sets.data ?? [],
      live_sets: liveSets.data ?? [],
      releases: releases.data ?? [],
      release_links: releaseLinks.data ?? [],
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
export const savePresskitContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        release_body: z.string().min(1).max(10000),
        booking_email: z.string().trim().min(3).max(180).email(),
        logo_url: z.string().trim().max(800).nullable(),
        presskit_logo_urls: z.object({
          icon_clara: z.string().trim().max(800).nullable(),
          icon_escura: z.string().trim().max(800).nullable(),
          escrita_clara: z.string().trim().max(800).nullable(),
          escrita_escura: z.string().trim().max(800).nullable(),
        }),
        presskit_rider: z.array(z.array(z.string().trim().min(1).max(200)).min(1)).min(1).max(40),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("site_settings")
      .update({
        release_body: data.release_body,
        logo_url: data.logo_url,
        presskit_logo_urls: (() => {
          const v = data.presskit_logo_urls;
          const any = Object.values(v).some((u) => u && u.trim());
          return any ? v : null;
        })(),
        presskit_rider: data.presskit_rider,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("singleton_key", "main");
    if (error) throw error;
    const { error: homeError } = await context.supabase
      .from("tulio_home")
      .update({ booking_email: data.booking_email, updated_at: new Date().toISOString() })
      .eq("singleton_key", "main");
    if (homeError) throw homeError;
    return { ok: true };
  });

/** Volta a escrita TULIO do menu (`tulio-wordmark.png`) e o ícone padrão. */
export const resetPresskitBrandLogos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const presskit_logo_urls = defaultPresskitLogoVariants();
    const { error } = await context.supabase
      .from("site_settings")
      .update({
        logo_url: presskit_logo_urls.escrita_clara,
        presskit_logo_urls,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("singleton_key", "main");
    if (error) throw error;
    return { ok: true };
  });

export const saveSetsShuffle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sets_shuffle: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("site_settings")
      .update({ sets_shuffle: data.sets_shuffle, updated_at: new Date().toISOString() })
      .eq("singleton_key", "main");
    if (error) throw error;
    return { ok: true };
  });

export const saveSetsDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sets_description: z.string().trim().max(1000) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("site_settings")
      .update({
        sets_description: data.sets_description === "" ? null : data.sets_description,
        updated_at: new Date().toISOString(),
      } as never)
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

const homeUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Link inválido.");
const homeImage = z
  .string()
  .trim()
  .max(800)
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v), "Imagem inválida.");

export const saveTulioHome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        section1_image_url: homeImage,
        section1_right_image_url: homeImage,
        section1_image_alt: z.string().trim().max(180),
        booking_email: z.string().trim().max(180),
        facebook_url: homeUrl,
        x_url: homeUrl,
        tiktok_url: homeUrl,
        youtube_url: homeUrl,
        soundcloud_url: homeUrl,
        bandcamp_url: homeUrl,
        instagram_url: homeUrl,
        spotify_url: homeUrl,
        beatport_url: homeUrl,
        hero_title: z.string().trim().max(120).optional(),
        hero_body: z.string().max(10000).optional(),
        hero_image_url: homeImage.optional(),
        social_order: z
          .array(z.enum(DEFAULT_SOCIAL_ORDER as [SocialKey, ...SocialKey[]]))
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { social_order, ...fields } = data;
    const clean = Object.fromEntries(
      Object.entries(fields)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, value === "" ? null : value]),
    );
    const { error } = await context.supabase
      .from("tulio_home")
      .update({ ...clean, updated_at: new Date().toISOString() })
      .eq("singleton_key", "main");
    if (error) throw error;
    // Separate update so links still save while the social_order column (0017) is missing.
    let orderSaved = true;
    if (social_order) {
      const order = await context.supabase
        .from("tulio_home")
        .update({ social_order: normalizeSocialOrder(social_order) })
        .eq("singleton_key", "main");
      orderSaved = !order.error;
    }
    return { ok: true, orderSaved };
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
        "source_type",
        "external_provider",
        "external_id",
        "embed_url",
      ],
      tulio_media: [
        "id",
        "kind",
        "title",
        "storage_bucket",
        "storage_path",
        "public_url",
        "poster_url",
        "alt_text",
        "sort_order",
        "homepage_order",
        "visible",
        "presskit_enabled",
        "presskit_studio_enabled",
        "downloadable",
        "homepage_enabled",
        "party_id",
        "captured_at",
        "source_type",
        "external_provider",
        "external_id",
        "embed_url",
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

/** Drop a gallery group: unlink tulio_media from the party, then delete the row in parties when it is a saved festa. */
export const dissolvePartyGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ party_id: z.string().trim().min(1).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error: mediaError } = await context.supabase
      .from("tulio_media")
      .update({ party_id: null })
      .eq("party_id", data.party_id);
    if (mediaError) throw mediaError;
    if (isSavedPartyId(data.party_id)) {
      const { error } = await context.supabase.from("parties").delete().eq("id", data.party_id);
      if (error) throw error;
    }
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
