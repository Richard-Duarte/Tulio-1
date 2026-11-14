import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  groupPresskitByParty,
  PRESSKIT_STUDIO_PARTY_ID,
  sortMediaNewest,
} from "./gallery-groups.ts";

const src = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(src, path), "utf8");

test("presskit loads tulio_media rows flagged presskit_enabled", () => {
  const body = read("lib/presskit.functions.ts");
  assert.match(body, /\.eq\("presskit_enabled", true\)/);
  assert.doesNotMatch(body, /STUDIO_PHOTOS/);
});

test("Estúdio section is first and sorted newest first", () => {
  const parties = [{ id: "festa", name: "Festa", happened_at: "2025-01-01" }];
  const items = [
    { id: "a", party_id: "festa", captured_at: "2024-06-01", presskit_studio_enabled: false },
    { id: "b", party_id: "festa", captured_at: "2025-06-01", presskit_studio_enabled: true },
    { id: "c", party_id: "festa", captured_at: "2025-01-01", presskit_studio_enabled: true },
  ];
  const groups = groupPresskitByParty(parties, items, "Estúdio", "Outros");
  assert.equal(groups[0]!.party.id, PRESSKIT_STUDIO_PARTY_ID);
  assert.deepEqual(
    groups[0]!.photos.map((p) => p.id),
    ["b", "c"],
  );
  assert.equal(groups[1]!.photos[0]!.id, "a");
});

test("sortMediaNewest orders by captured_at", () => {
  const sorted = sortMediaNewest([
    { id: "1", captured_at: "2020-01-01" },
    { id: "2", captured_at: "2025-01-01" },
  ]);
  assert.deepEqual(sorted.map((x) => x.id), ["2", "1"]);
});

test("admin shows Estúdio toggle only with presskit", () => {
  const library = read("components/jula/admin/MediaLibrary.tsx");
  assert.match(library, /presskit_studio_enabled/);
  assert.match(library, /Estúdio/);
});