import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: { rpc: (name: string, args: unknown) => Promise<{ data: unknown; error: unknown }> }; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso negado.");
}

const transcodeInput = z.object({
  sourcePath: z.string().min(1),
  destPath: z.string().min(1),
});

export const transcodeSiteMediaVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => transcodeInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { transcodeStorageVideo } = await import("@/lib/video-transcode.server");
    return transcodeStorageVideo(supabaseAdmin, data.sourcePath, data.destPath);
  });
