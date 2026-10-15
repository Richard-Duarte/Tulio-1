/** Normalized triangle (0–1) of the mark silhouette inside its square asset. */
export type MarkTriangle = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  apexX: number;
};

const FALLBACK: MarkTriangle = {
  left: 0.08,
  right: 0.92,
  top: 0.08,
  bottom: 0.92,
  apexX: 0.5,
};

/** Measure the outer triangle from opaque light pixels (works for transparent marks). */
export function measureMarkTriangle(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): MarkTriangle {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3] ?? 0;
      if (a < 20) continue;
      const lum = ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0)) / 3;
      if (lum < 40) continue;
      found = true;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (!found) return { ...FALLBACK };

  const left = minX / width;
  const right = maxX / width;
  const top = minY / height;
  const bottom = maxY / height;
  return {
    left,
    right,
    top,
    bottom,
    apexX: (left + right) / 2,
  };
}

/** Pull the fill slightly inside the stroke so ASCII sits under the rim, not outside it. */
export function insetMarkTriangle(triangle: MarkTriangle, inset = 0.028): MarkTriangle {
  const left = Math.min(triangle.left + inset, triangle.apexX - 0.02);
  const right = Math.max(triangle.right - inset, triangle.apexX + 0.02);
  const top = Math.min(triangle.top + inset * 1.2, triangle.bottom - 0.08);
  const bottom = Math.max(triangle.bottom - inset, top + 0.08);
  return {
    left,
    right,
    top,
    bottom,
    apexX: (left + right) / 2,
  };
}
