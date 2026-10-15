export type RectLike = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** True when two axis-aligned rects intersect (including edge touch counts as overlap). */
export function rectsOverlap(a: RectLike, b: RectLike) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}
