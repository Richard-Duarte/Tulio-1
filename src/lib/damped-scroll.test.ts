import assert from "node:assert/strict";
import { test } from "node:test";
import { pageScrollMax } from "./damped-scroll.ts";

test("pageScrollMax reaches full document bottom (no false shortfall)", () => {
  assert.equal(pageScrollMax(2000, 800), 1200);
  assert.equal(pageScrollMax(800, 800), 0);
  assert.equal(pageScrollMax(500, 800), 0);
});

test("pageScrollMax grows when layout height grows (footer/images)", () => {
  const before = pageScrollMax(1600, 900);
  const afterFooter = pageScrollMax(1600 + 240, 900);
  assert.ok(afterFooter > before);
  assert.equal(afterFooter - before, 240);
});
