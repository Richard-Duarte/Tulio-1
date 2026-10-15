import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const markPath = join(root, "public/brand/tulio-mark.png");

test("tulio-mark keeps transparent corners so the eye can tint the silhouette", () => {
  const script = `
from PIL import Image
import numpy as np
a = np.array(Image.open(${JSON.stringify(markPath)}).convert("RGBA"))
assert a[0,0,3] == 0 and a[0,-1,3] == 0 and a[-1,0,3] == 0 and a[-1,-1,3] == 0
lum = a[:,:,:3].mean(axis=2)
opaque_black = ((a[:,:,3] > 250) & (lum < 20)).sum()
assert opaque_black == 0, opaque_black
print("ok")
`;
  const out = execFileSync("python3", ["-c", script], { encoding: "utf8" }).trim();
  assert.equal(out, "ok");
});
