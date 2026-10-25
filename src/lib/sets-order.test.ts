import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { latestUploadFirst, nextIndex } from "./sets-order.ts";

const src = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(src, path), "utf8");

const rows = [
  { id: "up", created_at: "2026-09-24T22:07:30.866548+00:00" },
  { id: "jul", created_at: "2026-09-25T13:07:19.645498+00:00" },
  { id: "bday", created_at: "2026-10-21T18:01:01.587512+00:00" },
  { id: "old", created_at: "2025-01-01T00:00:00+00:00" },
];

test("newest created_at goes first, the rest keep their order", () => {
  assert.deepEqual(latestUploadFirst(rows).map((r) => r.id), ["bday", "up", "jul", "old"]);
  assert.deepEqual(latestUploadFirst([]), []);
  assert.deepEqual(latestUploadFirst([rows[0]!]).map((r) => r.id), ["up"]);
});

test("does not mutate the input", () => {
  const copy = rows.slice();
  latestUploadFirst(rows);
  assert.deepEqual(rows, copy);
});

test("shuffle never repeats the current track and covers the others", () => {
  for (let i = 0; i < 4; i++) {
    for (const r of [0, 0.34, 0.67, 0.999]) {
      const n = nextIndex(i, 4, true, () => r);
      assert.notEqual(n, i);
      assert.ok(n >= 0 && n < 4);
    }
  }
  assert.equal(nextIndex(3, 4, false), 0);
  assert.equal(nextIndex(0, 1, true), 0);
});

test("player always starts on track 0 (the latest upload), even with shuffle", () => {
  const provider = read("components/sets/SetsPlayerProvider.tsx");
  assert.match(provider, /controller\.autoplay\(0\)/);
  assert.doesNotMatch(provider, /autoplay\([^)]*Math\.random/);
  assert.match(read("components/jula/AudioPlayer.tsx"), /latestUploadFirst\(/);
});

test("public sets are never cached so a new upload shows on the next visit", () => {
  const fns = read("lib/public.functions.ts");
  const music = fns.slice(fns.indexOf("export const getPublicMusic"));
  assert.match(music.slice(0, 600), /no-store/);
});
