#!/usr/bin/env bash
# Re-vendors Keta's "Underground" Three.js scene into the site.
#   scripts/sync-underground.sh [/path/to/underground-scene]
# Copies the scene modules (verbatim, minus the standalone main.js) to src/lib/underground/
# and the optimized GLBs to public/3d/models/. The site's React wrapper is
# src/components/sets/UndergroundScene.tsx (uses embed.js -> mount()).
set -euo pipefail
SRC="${1:-/workspace/underground-scene}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for f in app assets dj djRig embed layout lights optional rig textures warehouse; do
  cp "$SRC/src/$f.js" "$ROOT/src/lib/underground/$f.js"
done
for m in dj cerwin-vega-speaker pioneer-cdj3000-djm-a9; do
  cp "$SRC/public/models/$m.glb" "$ROOT/public/3d/models/$m.glb"
done
ls -la "$ROOT/public/3d/models"
# The credits line on /sets is a static mirror (src/components/sets/scene-credits.ts): warn if it drifted.
node -e '
const fs=require("fs");const app=fs.readFileSync(process.argv[1],"utf8");const mine=fs.readFileSync(process.argv[2],"utf8");
const m=app.match(/export const CREDITS = \[([\s\S]*?)\];/);if(!m){console.warn("CREDITS export not found");process.exit(0)}
const lines=[...m[1].matchAll(/\x27([^\x27]+)\x27/g)].map(x=>x[1]);const miss=lines.filter(l=>!mine.includes(l));
console.log(miss.length?"⚠ update scene-credits.ts, missing:\n  "+miss.join("\n  "):"credits mirror OK");
' "$ROOT/src/lib/underground/app.js" "$ROOT/src/components/sets/scene-credits.ts"
