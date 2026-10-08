# Underground scene (vendored)

Three.js warehouse techno scene by Keta (source: `/workspace/underground-scene`), used as the
full-viewport background of `/sets` through its embed API (`embed.js` → `mount()`).

- The `.js` files here are **verbatim copies** — don't edit them; re-sync instead:
  `scripts/sync-underground.sh [/path/to/underground-scene]`
- Types for the entry point: `embed.d.ts`.
- Models: `public/3d/models/*.glb` (meshopt + WebP). **To swap the DJ, replace
  `public/3d/models/dj.glb`** (clip `DJ_Dance_128BPM`, see `layout.js` → `BOOTH.dj`).
- React wrapper (lazy import, quality/fallback, dispose on unmount):
  `src/components/sets/UndergroundScene.tsx`. Poster fallback: `public/3d/underground-poster*.webp`.

Credits (shown on /sets): “Funktion One RES 2” by Javier — CC BY 4.0 · “Pioneer CDJ 3000 / DJM A9”
by MaxTht — CC BY 4.0 · “Cerwin Vega Speaker” by sonidero — Sketchfab Standard · DJ: MakeHuman /
MPFB — CC0.

## Camera controls on /sets
`UndergroundScene` passes `controls: true` (`resumeAfter: 8`) on fine-pointer devices and `controls: false`
on touch/coarse-pointer devices (OrbitControls sets `touch-action: none`, which would trap page scrolling).
While controls are live, `<body>`, the route wrappers and the `/sets` `<main>` are `pointer-events: none`
(other body children stay `auto`), so drags on empty space reach the canvas. `?controls=0` disables them.
