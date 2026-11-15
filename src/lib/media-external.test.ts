import assert from "node:assert/strict";
import { test } from "node:test";
import { embedSrc, isEmbedVideo, resolveExternalMediaUrl } from "./media-external.ts";

test("resolveExternalMediaUrl parses YouTube watch URLs", () => {
  const row = resolveExternalMediaUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.ok(row);
  assert.equal(row.external_provider, "youtube");
  assert.equal(row.external_id, "dQw4w9WgXcQ");
  assert.equal(row.kind, "video");
  assert.match(row.embed_url ?? "", /youtube-nocookie/);
  assert.match(row.poster_url ?? "", /ytimg/);
});

test("resolveExternalMediaUrl sets Vimeo poster", () => {
  const row = resolveExternalMediaUrl("https://vimeo.com/123456789");
  assert.ok(row);
  assert.match(row.poster_url ?? "", /vumbnail/);
});

test("resolveExternalMediaUrl accepts direct image URLs", () => {
  const row = resolveExternalMediaUrl("https://cdn.example.com/photo.webp");
  assert.ok(row);
  assert.equal(row.kind, "image");
  assert.equal(row.external_provider, "direct");
});

test("isEmbedVideo is true for external YouTube rows", () => {
  assert.equal(
    isEmbedVideo({ source_type: "external", external_provider: "youtube", external_id: "abc" }),
    true,
  );
  assert.equal(isEmbedVideo({ source_type: "storage" }), false);
});

test("embedSrc builds nocookie YouTube iframe URL", () => {
  const url = embedSrc({
    external_provider: "youtube",
    external_id: "dQw4w9WgXcQ",
    embed_url: null,
  });
  assert.match(url ?? "", /dQw4w9WgXcQ/);
});
