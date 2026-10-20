import assert from "node:assert/strict";
import { test } from "node:test";
import { getNocturnaHomeCopy } from "./nocturna-home.ts";

test("steps eyebrow is Jornada (regression vs Fluxo)", () => {
  const pt = getNocturnaHomeCopy("pt");
  assert.equal(pt.stepsEyebrow, "Jornada");
  assert.notEqual(pt.stepsEyebrow, "Fluxo");
});

test("English steps eyebrow is Journey", () => {
  assert.equal(getNocturnaHomeCopy("en").stepsEyebrow, "Journey");
});
