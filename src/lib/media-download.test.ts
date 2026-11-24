import assert from "node:assert/strict";
import { test } from "node:test";
import { mediaFilename } from "./media-download.ts";

const item = (partial: { id?: string; title: string; public_url: string }) => ({
  id: partial.id ?? "id-1",
  title: partial.title,
  public_url: partial.public_url,
});

test("mediaFilename uses tulio prefix and title instead of legacy jula uuid", () => {
  const name = mediaFilename(
    item({
      title: "Live D-Edge",
      public_url:
        "https://x.supabase.co/storage/v1/object/public/site-media/jula-9e491095-392e-4c1a-afc9-5b3177b7c7e2.jpeg",
    }),
  );
  assert.equal(name, "tulio-live-d-edge.jpeg");
  assert.doesNotMatch(name, /^jula-/);
});

test("mediaFilename keeps descriptive url stem with tulio prefix", () => {
  const name = mediaFilename(
    item({
      title: "",
      public_url: "https://cdn.example.com/gigs-01.webp",
    }),
  );
  assert.equal(name, "tulio-gigs-01.webp");
});