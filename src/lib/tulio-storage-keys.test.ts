import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  INTRO_SEEN_KEY,
  LEGACY_INTRO_SEEN_KEY,
  PRESSKIT_SESSION_COOKIE,
  SETS_PLAYER_MIN_BASE_KEY,
} from "./tulio-storage-keys.ts";

test("active storage keys use tulio prefix", () => {
  assert.match(INTRO_SEEN_KEY, /^tulio-/);
  assert.match(SETS_PLAYER_MIN_BASE_KEY, /^tulio-/);
  assert.match(PRESSKIT_SESSION_COOKIE, /^tulio-/);
  assert.match(LEGACY_INTRO_SEEN_KEY, /^jula-/);
});

test("runtime exports avoid jula- keys except explicit legacy constants", () => {
  const libDir = join(import.meta.dirname);
  const files = readdirSync(libDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  const offenders: string[] = [];
  for (const file of files) {
    const text = readFileSync(join(libDir, file), "utf8");
    const matches = text.matchAll(/export const [A-Z0-9_]+ = ["']jula-[^"']+["']/g);
    for (const m of matches) {
      const name = m[0].match(/export const ([A-Z0-9_]+)/)?.[1] ?? "?";
      if (!name.includes("LEGACY")) offenders.push(`${file}: ${name}`);
    }
  }
  assert.deepEqual(offenders, []);
});