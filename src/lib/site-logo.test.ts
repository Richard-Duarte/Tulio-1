import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SITE_LOGO, resolveSiteLogoUrl } from "./site-logo.ts";

test("resolveSiteLogoUrl uses default mark", () => {
  assert.equal(resolveSiteLogoUrl(null), DEFAULT_SITE_LOGO);
  assert.equal(resolveSiteLogoUrl(""), DEFAULT_SITE_LOGO);
  assert.equal(resolveSiteLogoUrl("https://cdn/logo.png"), "https://cdn/logo.png");
});