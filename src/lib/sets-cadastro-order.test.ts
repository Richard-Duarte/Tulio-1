import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  indexOfNewestPlayerTrack,
  indexOfNewestSet,
  sortOrderForNewSet,
  sortSetsNewestFirst,
} from "./sets-cadastro-order.ts";

const src = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(src, path), "utf8");

test("sortSetsNewestFirst orders by played_at descending", () => {
  const rows = [
    { id: "old", played_at: "2023-12-31", created_at: "2024-01-01T00:00:00Z" },
    { id: "mid", played_at: "2026-07-18", created_at: "2024-01-01T00:00:00Z" },
    { id: "new", played_at: "2026-10-31", created_at: "2024-01-01T00:00:00Z" },
  ];
  assert.deepEqual(sortSetsNewestFirst(rows).map((r) => r.id), ["new", "mid", "old"]);
});

test("indexOfNewestSet respects manual queue order", () => {
  const queue = [
    { id: "b", played_at: "2023-01-01" },
    { id: "a", played_at: "2026-01-01" },
  ];
  assert.equal(indexOfNewestSet(queue), 1);
  assert.equal(
    indexOfNewestPlayerTrack([
      { id: "b", playedAt: "2023-01-01" },
      { id: "a", playedAt: "2026-01-01" },
    ]),
    1,
  );
});

test("sortOrderForNewSet inserts by date among existing rows", () => {
  const items = [
    { id: "1", played_at: "2026-10-31", created_at: "2024-01-01T00:00:00Z" },
    { id: "2", played_at: "2023-12-31", created_at: "2024-01-01T00:00:00Z" },
  ];
  assert.equal(sortOrderForNewSet(items, "2026-07-18"), 1);
});

test("player autoplay targets newest set, not fixed index 0", () => {
  const provider = read("components/sets/SetsPlayerProvider.tsx");
  assert.match(provider, /indexOfNewestPlayerTrack/);
  assert.doesNotMatch(provider, /controller\.autoplay\(0\)/);
});

test("admin sets tab has reorganize-by-date control", () => {
  assert.match(read("components/jula/admin/LinkSetEditor.tsx"), /Reorganizar por data/);
  assert.match(read("components/jula/admin/LinkSetEditor.tsx"), /sortSetsNewestFirst/);
});