import { createHash, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
// `useSession` is an h3 server utility, not a React hook; alias it to avoid confusion.
import { setResponseHeader, useSession as getSession } from "@tanstack/react-start/server";
import { z } from "zod";

const SESSION_MAX_AGE = 60 * 60 * 12;

function sessionConfig() {
  return {
    password: process.env["PRESSKIT_SESSION_SECRET"]!,
    name: "jula-presskit",
    maxAge: SESSION_MAX_AGE,
    cookie: {
      httpOnly: true,
      secure: true,
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
};

export type PresskitContent =
  | { unlocked: false }
  | {
      unlocked: true;
      media: PresskitMedia[];
      /** Technical rider: each line lists interchangeable equipment options. */
      rider: string[][];
    };

// Kept server-side so the rider is only sent after unlock (not in the JS bundle).
const TECHNICAL_RIDER: string[][] = [
  ["03 CDJ 3000", "CDJ 2000 Nexus 2"],
  ["01 DJ Mixer DJM V10", "DJM A9", "DJM 900 Nexus 2"],
];

/**
 * Protected presskit content. Only returned after verifying the unlock session
 * cookie server-side; the locked response carries no media URLs or metadata.
 * Safe to call from route loaders/preloads while locked.
 */
export const getPresskitContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<PresskitContent> => {
    noStore();
    if (!(await hasPresskitAccess())) return { unlocked: false };
    return { unlocked: true, media: [], rider: TECHNICAL_RIDER };
  },
);

export const unlockPresskit = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ password: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data }) => {
    noStore();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: stored } = await supabaseAdmin
      .from("app_secrets")
      .select("value")
      .eq("key", "presskit_password")
      .maybeSingle();
    const expected = stored?.value ?? process.env["PRESSKIT_PASSWORD"];
    if (!expected || !match(data.password, expected)) return { ok: false as const };
    const session = await getSession<PresskitSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });
