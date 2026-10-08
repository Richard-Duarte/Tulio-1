import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  fetchPageMetadata,
  fetchSoundcloudMetadata,
  fetchYoutubeMetadata,
} from "@/lib/link-metadata";

// Admin-only so the server never acts as an open fetch proxy.
async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso negado.");
}

const input = (value: unknown) => z.object({ url: z.string().trim().min(8).max(500) }).parse(value);

export const getSoundcloudMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return fetchSoundcloudMetadata(data.url);
  });

export const getYoutubeMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return fetchYoutubeMetadata(data.url);
  });

/** Any public web page (e.g. a ticketing link): og:image, title and event date/venue if declared. */
export const getPageMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) =>
    z
      .object({
        url: z
          .string()
          .trim()
          .max(2000)
          .refine((v) => /^https?:\/\//i.test(v), "Link inválido."),
      })
      .parse(value),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return fetchPageMetadata(data.url);
  });
