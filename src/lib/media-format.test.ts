import assert from "node:assert/strict";
import { test } from "node:test";
import { mediaFormatLabel } from "./media-format.ts";

test("mediaFormatLabel uses file extension for storage uploads", () => {
  assert.equal(
    mediaFormatLabel({
      kind: "image",
      source_type: "storage",
      storage_path: "library/abc.webp",
    }),
    "WEBP",
  );
  assert.equal(
    mediaFormatLabel({
      kind: "video",
      source_type: "storage",
      public_url: "https://x.com/a/library/clip.MP4",
    }),
    "MP4",
  );
});

test("mediaFormatLabel names external providers", () => {
  assert.equal(
    mediaFormatLabel({ kind: "video", source_type: "embed", external_provider: "youtube" }),
    "YouTube",
  );
  assert.equal(
    mediaFormatLabel({ kind: "image", source_type: "external", external_provider: "vimeo" }),
    "Vimeo",
  );
});