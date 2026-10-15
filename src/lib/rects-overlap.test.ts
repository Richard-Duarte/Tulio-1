import assert from "node:assert/strict";
import { test } from "node:test";
import { rectsOverlap } from "./rects-overlap.ts";

test("rectsOverlap detects player covering ADM (regression)", () => {
  const adm = { left: 900, right: 980, top: 900, bottom: 930 };
  const player = { left: 700, right: 1100, top: 600, bottom: 980 };
  assert.equal(rectsOverlap(adm, player), true);
});

test("rectsOverlap is false when player is clear of ADM", () => {
  const adm = { left: 900, right: 980, top: 900, bottom: 930 };
  const mini = { left: 1000, right: 1100, top: 940, bottom: 990 };
  assert.equal(rectsOverlap(adm, mini), false);
});
