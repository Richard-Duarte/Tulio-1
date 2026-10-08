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
  - `lineArray.js` (Tulio only): two flown line-array hangs (procedural three.js geometry: fly bar on chain hoists,
    6 wedge cabinets in a J-curve) just outboard of the sub stacks; config in `layout.js` → `LINE_ARRAY`,
    added to the scene in `app.js` right after `buildRig()`.
- Types for the entry point: `embed.d.ts`.
- Models: `public/3d/models/*.glb` (meshopt + WebP). **To swap the DJ, replace
  `public/3d/models/dj.glb`** (clip `DJ_Dance_128BPM`, see `layout.js` → `BOOTH.dj`).
- DJ (`dj.glb`, ~410 KB): Tulio modelled from his reference photo on the MakeHuman/MPFB2 (CC0) base mesh + mixamo rig —
  face shape via MPFB targets, hand-painted (procedural) skin/beard/hair texture, hair and beard volume shells,
  black tee + dark pants (`male_casualsuit06` recoloured), black shoes (`shoes03`), cord necklace with a silver bar
  and a black smartwatch on the left wrist. Same 16-beat `DJ_Dance_128BPM` clip as before (no photo texture on the face).
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
