import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../styles.css"),
  "utf8",
);

test("nc-pad-y uses the same token for top and bottom (grid type rhythm)", () => {
  assert.match(css, /--nc-pad-y:\s*3rem/);
  assert.match(css, /--nc-pad-y-md:\s*4rem/);
  const block = css.match(/\.nc-pad-y\s*\{([^}]+)\}/);
  assert.ok(block, "nc-pad-y rule missing");
  assert.match(block[1]!, /padding-top:\s*var\(--nc-pad-y\)/);
  assert.match(block[1]!, /padding-bottom:\s*var\(--nc-pad-y\)/);
});

test("asymmetric Jornada header pad (pt-12 pb-6) is not hardcoded on home", () => {
  const index = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../routes/index.tsx"),
    "utf8",
  );
  assert.doesNotMatch(index, /pt-12\s+pb-6/);
  assert.doesNotMatch(index, /md:pt-16\s+md:pb-8/);
});
