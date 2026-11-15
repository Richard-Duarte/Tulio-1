import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { resolveVideoPosterUrl } from "./video-poster.ts";

const src = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(src, path), "utf8");

test("resolveVideoPosterUrl prefers stored poster_url", () => {
  assert.equal(
    resolveVideoPosterUrl({ poster_url: "https://cdn.example.com/p.webp", public_url: "https://x.mp4" }),
    "https://cdn.example.com/p.webp",
  );
});

test("resolveVideoPosterUrl falls back to YouTube thumbnail", () => {
  assert.equal(
    resolveVideoPosterUrl({
      external_provider: "youtube",
      external_id: "abc123XYZ",
    }),
    "https://i.ytimg.com/vi/abc123XYZ/hqdefault.jpg",
  );
});

test("resolveVideoPosterUrl falls back to Vimeo thumbnail", () => {
  assert.equal(
    resolveVideoPosterUrl({ external_provider: "vimeo", external_id: "987654" }),
    "https://vumbnail.com/987654.jpg",
  );
});

test("gallery videos show poster cover before play", () => {
  const grid = read("components/jula/MediaGrid.tsx");
  assert.match(grid, /resolveVideoPosterUrl/);
  assert.match(grid, /VideoPosterCover/);
});