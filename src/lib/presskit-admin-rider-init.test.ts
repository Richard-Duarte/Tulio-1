import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePresskitRider, riderTextFromLines } from "./presskit-rider.ts";

test("presskit admin rider init: parsed DB rows become editable text", () => {
  const rows = parsePresskitRider([
    ["03 CDJ 3000", "CDJ 2000 NEXUS 2"],
    ["01 XONE 92", "DJ MIXER DJM V10"],
  ]);
  const text = riderTextFromLines(rows);
  assert.match(text, /CDJ 3000/);
  assert.match(text, /\|/);
  assert.doesNotMatch(text, /\[object/);
});