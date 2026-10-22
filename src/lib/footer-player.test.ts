import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const src = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(src, path), "utf8");

test("social icons carry no CSS filter or lazy pop-in (iOS paints filtered layers over the player)", () => {
  const bar = read("components/jula/SocialBar.tsx");
  assert.doesNotMatch(bar, /brightness-0|invert/);
  assert.doesNotMatch(bar, /loading="lazy"/);
});

test("player glass is near-opaque so footer icons never read through it", () => {
  for (const file of ["components/sets/SetsPlayer.tsx", "components/sets/ScenePreview.tsx"]) {
    const glass = read(file).match(/const glass =\s*"([^"]+)"/);
    assert.ok(glass, `glass missing in ${file}`);
    assert.doesNotMatch(glass[1]!, /bg-background\/40/);
    const alpha = glass[1]!.match(/bg-black\/(\d+)/);
    assert.ok(alpha && Number(alpha[1]) >= 85, `${file} glass must be at least 85% opaque`);
  }
});

test("admin entry is the word Tulio in the copyright, not a visible ADM label", () => {
  const footer = read("components/jula/Footer.tsx");
  assert.match(footer, /Copyright\{" "\}[\s\S]*?<Link to="\/auth"[^>]*>\s*Tulio\s*<\/Link>/);
  assert.doesNotMatch(footer, />\s*ADM\s*</);
});
