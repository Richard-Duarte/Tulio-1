import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_SITE_LOGO,
  parsePresskitLogoVariants,
  presskitLogoUrlsForDownload,
  presskitSlotPreviewFallback,
  primaryPresskitLogoUrl,
  siteIconUrl,
  siteWordmarkUrl,
} from "./presskit-logo-variants.ts";

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
  assert.equal(siteIconUrl({ icon_clara: "https://eye.png" }), "https://eye.png");
});

test("siteWordmarkUrl uses escrita clara on dark chrome", () => {
  assert.equal(
    siteWordmarkUrl({ escrita_clara: "https://custom-word.png" }),
    "https://custom-word.png",
  );
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