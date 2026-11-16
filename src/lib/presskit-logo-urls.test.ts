import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SITE_LOGO } from "./site-logo.ts";
import { parsePresskitLogoUrls, presskitDisplayLogoUrl } from "./presskit-logo-urls.ts";

test("parsePresskitLogoUrls prefers json array over single logo_url", () => {
  assert.deepEqual(parsePresskitLogoUrls(["https://a/w.png", "https://a/b.png"], "https://x"), [
    "https://a/w.png",
    "https://a/b.png",
  ]);
});

test("parsePresskitLogoUrls falls back to logo_url then default", () => {
  assert.deepEqual(parsePresskitLogoUrls(null, "https://one/logo.png"), ["https://one/logo.png"]);
  assert.deepEqual(parsePresskitLogoUrls([], null), [DEFAULT_SITE_LOGO]);
});

test("presskitDisplayLogoUrl uses first variant", () => {
  assert.equal(
    presskitDisplayLogoUrl(["https://white.png", "https://black.png"], null),
    "https://white.png",
  );
  assert.equal(
    presskitDisplayLogoUrl({ escrita_clara: "https://w.png", icon_clara: "https://i.png" }, null),
    "https://w.png",
  );
});