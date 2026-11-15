import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_PRESSKIT_RIDER,
  parsePresskitRider,
  riderLinesFromText,
  riderTextFromLines,
} from "./presskit-rider.ts";

test("rider text round-trips", () => {
  const lines = [["CDJ 3000", "CDJ 2000"], ["XONE 92"]];
  const text = riderTextFromLines(lines);
  assert.equal(text, "CDJ 3000 | CDJ 2000\nXONE 92");
  assert.deepEqual(riderLinesFromText(text), lines);
});

test("parsePresskitRider falls back when empty", () => {
  assert.deepEqual(parsePresskitRider(null), DEFAULT_PRESSKIT_RIDER);
  assert.deepEqual(parsePresskitRider([]), DEFAULT_PRESSKIT_RIDER);
});