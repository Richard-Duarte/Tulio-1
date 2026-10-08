# Underground scene (vendored)

Three.js warehouse techno scene by Keta (source: `/workspace/underground-scene`), used as the
full-viewport background of `/sets` through its embed API (`embed.js` → `mount()`).

- The `.js` files started as verbatim copies of Keta's scene; **Tulio diverges** (don't blindly re-sync
  with `scripts/sync-underground.sh`):
  - `layout.js`: venue = `models/brutalist-interior.glb` (`WAREHOUSE.glb`: fit/offset, emissive curve,
    fog/haze overrides); DJ tint/hidden meshes (`BOOTH.dj.materialTint` / `hideMeshes`).
  - `warehouse.js`: venue material tweaks (emissive power curve via `onBeforeCompile`, metalness cap).
  - `rig.js`: `loadModel` keeps `gltf.animations`; `buildRig` gives each animated clone a mixer
    (`rig.userData.mixers`, stepped in `app.js`).
  - `app.js`: venue GLB also in embed mode, `MODELS.sub` optional, roof light shafts hidden with a GLB venue.
  - `lights.js`: sodium lamp height follows `WAREHOUSE.eaveHeight`.
- Types for the entry point: `embed.d.ts`.
- Models: `public/3d/models/*.glb` (meshopt + WebP). **To swap the DJ, replace
  `public/3d/models/dj.glb`** (clip `DJ_Dance_128BPM`, see `layout.js` → `BOOTH.dj`).
- React wrapper (lazy import, quality/fallback, dispose on unmount):
  `src/components/sets/UndergroundScene.tsx`. Poster fallback: `public/3d/underground-poster*.webp`.

Credits (shown on /sets): “Brutalist Interior” — Sketchfab · “Funktion One RES 2” by Javier — CC BY 4.0 ·
“Pioneer CDJ 3000 / DJM A9” by MaxTht — CC BY 4.0 · “Cerwin Vega Speaker” by sonidero — Sketchfab Standard ·
DJ: MakeHuman / MPFB — CC0.

## Camera controls on /sets
`UndergroundScene` passes `controls: true` (`resumeAfter: 8`) on fine-pointer devices and `controls: false`
on touch/coarse-pointer devices (OrbitControls sets `touch-action: none`, which would trap page scrolling).
While controls are live, `<body>`, the route wrappers and the `/sets` `<main>` are `pointer-events: none`
(other body children stay `auto`), so drags on empty space reach the canvas. `?controls=0` disables them.
