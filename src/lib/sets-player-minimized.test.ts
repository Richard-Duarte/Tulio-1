import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { defaultSetsPlayerMinimized } from "./sets-player-minimized.ts";

const src = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(src, path), "utf8");

test("defaultSetsPlayerMinimized expands /sets on desktop only", () => {
  const savedMobile = globalThis.window;
  // @ts-expect-error test shim
  globalThis.window = {
    matchMedia: (q: string) => ({
      matches: q.includes("max-width: 767px"),
    }),
  };
  assert.equal(defaultSetsPlayerMinimized("/sets"), true);
  assert.equal(defaultSetsPlayerMinimized("/"), true);
  globalThis.window = {
    matchMedia: () => ({ matches: false }),
  };
  assert.equal(defaultSetsPlayerMinimized("/sets"), false);
  assert.equal(defaultSetsPlayerMinimized("/galeria"), true);
  globalThis.window = savedMobile;
});

test("SetsPlayerProvider applies route-aware default without global initialMinimized", () => {
  const provider = read("components/sets/SetsPlayerProvider.tsx");
  assert.match(provider, /defaultSetsPlayerMinimized/);
  assert.doesNotMatch(read("components/jula/AudioPlayer.tsx"), /initialMinimized/);
});