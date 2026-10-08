import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type UpcomingDate = {
  id: string;
  name: string;
  /** YYYY-MM-DD */
  event_date: string;
  /** HH:MM[:SS] or null */
  event_time: string | null;
  venue: string | null;
  city: string | null;
  description: string | null;
  ticket_url: string | null;
  /** Uploaded image if set, otherwise the ticket page preview image. */
  image: string | null;
};

const TIME_ZONE = "America/Sao_Paulo";

/** Today's date (YYYY-MM-DD) in São Paulo. */
function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Public: published dates from today (São Paulo) onwards, soonest first. */
export const getUpcomingDates = createServerFn({ method: "GET" }).handler(
  async (): Promise<UpcomingDate[]> => {
    if (import.meta.env.DEV && process.env["UPCOMING_DATES_MOCK"] === "1") {
      const { mockUpcomingDates } = await import("@/lib/upcoming-dates.mock");
      return mockUpcomingDates(todayInSaoPaulo());
    }
    const { publicSupabase } = await import("@/lib/supabase-public.server");
    const { data, error } = await publicSupabase()
      .from("upcoming_dates")
      .select(
        "id,name,description,event_date,event_time,venue,city,ticket_url,ticket_image_url,image_url",
      )
      .eq("published", true)
      .gte("event_date", todayInSaoPaulo())
      .order("event_date")
      .order("event_time", { nullsFirst: false });
    if (error) throw error;
    return (data ?? []).map(({ image_url, ticket_image_url, ...row }) => ({
      ...row,
      image: image_url ?? ticket_image_url ?? null,
    }));
  },
);

// ---------------------------------------------------------------- admin

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso negado.");
}

const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => /^https?:\/\//i.test(v), "Link inválido.");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

const upcomingDateInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullish()
    .or(z.literal(""))
    .transform((v) => v || null),
  venue: optionalText(160),
  city: optionalText(120),
  description: optionalText(2000),
  ticket_url: httpUrl
    .nullish()
    .or(z.literal(""))
    .transform((v) => v || null),
  ticket_image_url: httpUrl
    .nullish()
    .or(z.literal(""))
    .transform((v) => v || null),
  image_url: httpUrl
    .nullish()
    .or(z.literal(""))
    .transform((v) => v || null),
  published: z.boolean().default(true),
});
export type UpcomingDateInput = z.input<typeof upcomingDateInput>;

export const getAdminUpcomingDates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("upcoming_dates")
      .select("*")
      .order("event_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const saveUpcomingDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => upcomingDateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...fields } = data;
    const row = { ...fields, ...(id ? { id } : {}), updated_at: new Date().toISOString() };
    const { data: saved, error } = await context.supabase
      .from("upcoming_dates")
      .upsert(row)
      .select()
      .single();
    if (error) throw error;
    return saved;
  });

export const deleteUpcomingDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("upcoming_dates").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
