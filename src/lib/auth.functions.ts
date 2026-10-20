import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ password: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const envPassword = process.env["ADMIN_PANEL_PASSWORD"] || process.env["ADMIN_INITIAL_PASSWORD"];
    const internalEmail = process.env["ADMIN_SYNTHETIC_EMAIL"];
    const internalPassword = process.env["ADMIN_AUTH_PASSWORD"];
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Acesso administrativo indisponível.");
    let expectedPassword = envPassword;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: secret } = await supabaseAdmin
        .from("app_secrets")
        .select("value")
        .eq("key", "admin_panel_password")
        .maybeSingle();
      if (secret?.value) expectedPassword = secret.value;
    } catch {
      // Keep the env password when the secret store is unavailable.
    }
    if (!expectedPassword || data.password !== expectedPassword) return { ok: false as const };
    if (!internalEmail || !internalPassword) throw new Error("Sessão administrativa não configurada.");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error } = await client.auth.signInWithPassword({
      email: internalEmail,
      password: internalPassword,
    });
    if (error || !auth.session) throw new Error("Não foi possível iniciar a sessão.");
    return {
      ok: true as const,
      accessToken: auth.session.access_token,
      refreshToken: auth.session.refresh_token,
    };
  });
