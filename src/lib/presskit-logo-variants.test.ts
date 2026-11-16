import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_SITE_LOGO,
  isPresskitIconUrl,
  normalizePresskitLogoVariants,
  parsePresskitLogoVariants,
  presskitLogoUrlsForDownload,
  presskitSlotPreviewFallback,
  primaryPresskitLogoUrl,
  siteIconUrl,
  siteWordmarkUrl,
} from "./presskit-logo-variants.ts";

test("normalizePresskitLogoVariants moves ícone out of Logo slot", () => {
  const mark = "https://x.supabase.co/storage/v1/object/public/site-media/brand/logo-icon_clara-1.png";
  const v = parsePresskitLogoVariants({ escrita_clara: mark });
  assert.equal(v.escrita_clara, null);
  assert.equal(v.icon_clara, mark);
  assert.ok(isPresskitIconUrl(mark));
});

test("parsePresskitLogoVariants maps legacy logo_url ícone to icon_clara", () => {
  const v = parsePresskitLogoVariants(null, "/brand/tulio-mark.png");
  assert.equal(v.icon_clara, "/brand/tulio-mark.png");
  assert.equal(v.escrita_clara, null);
});

test("parsePresskitLogoVariants reads structured object", () => {
  const v = parsePresskitLogoVariants({
    icon_clara: "https://a/icon-light.png",
    escrita_clara: "https://a/word-light.png",
  });
  assert.equal(v.icon_clara, "https://a/icon-light.png");
  assert.equal(v.escrita_clara, "https://a/word-light.png");
  assert.equal(v.icon_escura, null);
});

test("parsePresskitLogoVariants maps legacy string array to slots", () => {
  const v = parsePresskitLogoVariants([
    "https://w1.png",
    "https://w2.png",
    "https://i1.png",
  ]);
  assert.equal(v.escrita_clara, "https://w1.png");
  assert.equal(v.escrita_escura, "https://w2.png");
  assert.equal(v.icon_clara, "https://i1.png");
});

test("siteIconUrl uses ícone slots or default mark, not wordmark", () => {
  assert.equal(
    siteIconUrl({ escrita_clara: "https://word.png" }, "https://word.png"),
    DEFAULT_SITE_LOGO,
  );
  assert.equal(
    siteIconUrl({ icon_clara: "https://x/brand/logo-icon_clara-1.png" }),
    "https://x/brand/logo-icon_clara-1.png",
  );
  assert.equal(
    siteIconUrl({ icon_clara: "https://www.tuliomusic.com.br/brand/tulio-wordmark.png" }),
    DEFAULT_SITE_LOGO,
  );
});

test("siteWordmarkUrl uses escrita clara on dark chrome", () => {
  assert.equal(
    siteWordmarkUrl({ escrita_clara: "https://custom-word.png" }),
    "https://custom-word.png",
  );
});

test("siteWordmarkUrl ignores escrita_escura on dark chrome", () => {
  assert.equal(siteWordmarkUrl({ escrita_escura: "https://black-word.png" }), "/brand/tulio-wordmark.png");
});

test("siteWordmarkUrl ignores wrong logo_url escura upload", () => {
  const bad = "https://x.supabase.co/brand/logo-escrita_escura-1.png";
  assert.equal(siteWordmarkUrl(null, bad), "/brand/tulio-wordmark.png");
});

test("primaryPresskitLogoUrl ignores ícone (só escrita)", () => {
  assert.equal(
    primaryPresskitLogoUrl({ icon_clara: "https://triangle.png", escrita_clara: null }, null),
    "/brand/tulio-wordmark.png",
  );
});

test("presskitSlotPreviewFallback leaves escura empty until upload", () => {
  assert.equal(presskitSlotPreviewFallback("escrita_escura"), null);
  assert.equal(presskitSlotPreviewFallback("escrita_clara"), "/brand/tulio-wordmark.png");
});

test("presskitLogoUrlsForDownload dedupes slots", () => {
  const urls = presskitLogoUrlsForDownload({
    icon_clara: "https://same.png",
    icon_escura: null,
    escrita_clara: "https://same.png",
    escrita_escura: "https://other.png",
  });
  assert.deepEqual(urls, ["https://same.png", "https://other.png"]);
});