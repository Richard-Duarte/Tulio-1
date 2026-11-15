import assert from "node:assert/strict";
import { test } from "node:test";
import { setsToTracks } from "./sets-to-tracks.ts";

const base = {
  description: null,
  cover_url: null,
  duration_seconds: 60,
  published: true,
  created_at: "2026-01-01T00:00:00Z",
  sort_order: 0,
};

test("setsToTracks preserves admin order (no created_at bump to front)", () => {
  const sets = [
    { ...base, id: "first", title: "A", soundcloud_url: "https://soundcloud.com/a", played_at: "2026-10-31", sort_order: 0, created_at: "2026-01-01T00:00:00Z" },
    { ...base, id: "second", title: "B", soundcloud_url: "https://soundcloud.com/b", played_at: "2023-12-31", sort_order: 1, created_at: "2026-06-01T00:00:00Z" },
    { ...base, id: "third", title: "C", soundcloud_url: "https://soundcloud.com/c", played_at: "2026-07-18", sort_order: 2, created_at: "2026-03-01T00:00:00Z" },
  ];
  assert.deepEqual(setsToTracks(sets).map((t) => t.id), ["first", "second", "third"]);
});