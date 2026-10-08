// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Hosting target. The wrapper defaults nitro to `cloudflare-module` (Lovable's host).
// On Vercel (Git builds and `vercel build` both set VERCEL=1) pin the `vercel` preset so the
// build emits `.vercel/output` (Build Output API). `entryFormat: "node"` avoids the srvx
// `runtime.node` crash seen with the default web entry (TanStack/router#6562).
// Elsewhere nitro keeps its zero-config detection; `NITRO_PRESET=node-server` gives a
// locally runnable server (`node .output/server/index.mjs`).
const nitro = process.env.VERCEL
  ? ({ preset: "vercel", vercel: { entryFormat: "node" } } as { preset: string })
  : undefined;

export default defineConfig({
  nitro,
  vite: {
    optimizeDeps: {
      exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
