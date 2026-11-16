import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const src = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(src, path), "utf8");

test("home abertura uses CMS ícone from presskit variants", () => {
  const home = read("routes/index.tsx");
  assert.match(home, /siteIconUrl/);
});