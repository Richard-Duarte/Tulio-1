import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_HERO_TITLE, HERO_ROLE_LINE, resolveHeroTitle } from "./hero-copy.ts";

test("resolveHeroTitle defaults to Trajetória when empty", () => {
  assert.equal(resolveHeroTitle(null), DEFAULT_HERO_TITLE);
  assert.equal(resolveHeroTitle(""), DEFAULT_HERO_TITLE);
  assert.equal(resolveHeroTitle("   "), DEFAULT_HERO_TITLE);
});

test("resolveHeroTitle keeps a custom admin title", () => {
  assert.equal(resolveHeroTitle("Bio"), "Bio");
});

test("role line includes BR (regression vs DJ · produtor · SP)", () => {
  assert.equal(HERO_ROLE_LINE, "DJ · produtor · SP · BR");
  assert.match(HERO_ROLE_LINE, /· BR$/);
  assert.notEqual(HERO_ROLE_LINE, "DJ · produtor · SP");
});
