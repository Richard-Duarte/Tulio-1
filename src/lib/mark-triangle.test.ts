import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { insetMarkTriangle, measureMarkTriangle } from "./mark-triangle.ts";

const markPath = join(dirname(fileURLToPath(import.meta.url)), "../../public/brand/tulio-mark.png");

test("measureMarkTriangle reads the opaque light bbox", () => {
  const w = 100;
  const h = 100;
  const data = new Uint8ClampedArray(w * h * 4);
  const paint = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  };
  paint(10, 20);
  paint(90, 20);
  paint(10, 80);
  paint(90, 80);
  const tri = measureMarkTriangle(data, w, h);
  assert.equal(tri.left, 0.1);
  assert.equal(tri.right, 0.9);
  assert.equal(tri.top, 0.2);
  assert.equal(tri.bottom, 0.8);
  assert.equal(tri.apexX, 0.5);
});

test("live mark triangle is inset from the old hardcoded 0.08/0.92 clip", () => {
  const script = `
from PIL import Image
import numpy as np, json
a = np.array(Image.open(${JSON.stringify(markPath)}).convert("RGBA"))
h, w = a.shape[:2]
ys, xs = np.where((a[:,:,3] > 20) & (a[:,:,:3].mean(axis=2) > 40))
print(json.dumps({
  "left": float(xs.min() / w),
  "right": float(xs.max() / w),
  "top": float(ys.min() / h),
  "bottom": float(ys.max() / h),
}))
`;
  const bbox = JSON.parse(execFileSync("python3", ["-c", script], { encoding: "utf8" }));
  // Old ASCII clip used top≈0.08 / bottom≈0.92 — that floats outside this mark.
  assert.ok(bbox.top > 0.15, `expected lower apex than old clip, got ${bbox.top}`);
  assert.ok(bbox.bottom < 0.85, `expected higher base than old clip, got ${bbox.bottom}`);
  const inset = insetMarkTriangle({
    ...bbox,
    apexX: (bbox.left + bbox.right) / 2,
  });
  assert.ok(inset.top > bbox.top);
  assert.ok(inset.bottom < bbox.bottom);
  assert.ok(inset.left > bbox.left);
  assert.ok(inset.right < bbox.right);
});
