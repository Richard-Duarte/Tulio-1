// Procedural canvas textures (no external image files needed).
import * as THREE from 'three';

let seed = 1337;
export const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const rr = (a, b) => a + rand() * (b - a);

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
function noise(ctx, w, h, amt) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}
// blotch that wraps around tile edges
function blotch(ctx, w, x, y, r, color) {
  for (const ox of [-w, 0, w]) for (const oy of [-w, 0, w]) {
    const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
  }
}

export function concreteTextures(size = 1024) {
  const [c, ctx] = canvas(size);
  ctx.fillStyle = '#6f6c67'; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 260; i++) blotch(ctx, size, rr(0, size), rr(0, size), rr(20, 160), `rgba(${rand() < 0.5 ? '0,0,0' : '200,195,185'},${rr(0.03, 0.09)})`);
  for (let i = 0; i < 14; i++) blotch(ctx, size, rr(0, size), rr(0, size), rr(30, 110), `rgba(10,8,5,${rr(0.15, 0.4)})`); // oil stains
  // cracks
  ctx.strokeStyle = 'rgba(20,18,15,0.55)';
  for (let i = 0; i < 9; i++) {
    let x = rr(0, size), y = rr(0, size), a = rr(0, Math.PI * 2);
    ctx.lineWidth = rr(0.8, 2); ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 40; k++) { a += rr(-0.6, 0.6); x += Math.cos(a) * 7; y += Math.sin(a) * 7; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  // expansion joints at the tile border
  ctx.fillStyle = 'rgba(25,23,20,0.8)'; ctx.fillRect(0, 0, size, 3); ctx.fillRect(0, 0, 3, size);
  noise(ctx, size, size, 26);
  const map = tex(c);

  // large-scale roughness (wet / polished patches) — non repeating, stretched over the whole floor
  const [r, rctx] = canvas(512);
  rctx.fillStyle = '#b0b0b0'; rctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) blotch(rctx, 512, rr(0, 512), rr(0, 512), rr(15, 90), `rgba(0,0,0,${rr(0.25, 0.6)})`);
  noise(rctx, 512, 512, 30);
  const rough = tex(r, { srgb: false });
  return { map, rough };
}

export function brickTexture(size = 1024) {
  const [c, ctx] = canvas(size);
  ctx.fillStyle = '#5a554d'; ctx.fillRect(0, 0, size, size);
  const cols = 8, rows = 28, bw = size / cols, bh = size / rows, m = 4;
  for (let y = 0; y < rows; y++) {
    const off = (y % 2) * bw / 2;
    for (let x = -1; x < cols + 1; x++) {
      const burnt = rand() < 0.12;
      const r = burnt ? rr(55, 75) : rr(95, 135), g = r * rr(0.4, 0.5), b = r * rr(0.3, 0.38);
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(x * bw + off + m / 2, y * bh + m / 2, bw - m, bh - m);
    }
  }
  for (let i = 0; i < 120; i++) blotch(ctx, size, rr(0, size), rr(0, size), rr(20, 140), `rgba(${rand() < 0.7 ? '10,8,6' : '160,160,150'},${rr(0.05, 0.2)})`);
  // vertical water streaks
  for (let i = 0; i < 25; i++) {
    const x = rr(0, size), w = rr(4, 30), g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, `rgba(15,12,10,${rr(0.05, 0.15)})`); g.addColorStop(1, 'rgba(15,12,10,0)');
    ctx.fillStyle = g; ctx.fillRect(x, 0, w, size * rr(0.4, 1));
  }
  noise(ctx, size, size, 22);
  return tex(c);
}

export function corrugatedTextures() {
  const [c, ctx] = canvas(256);
  for (let x = 0; x < 256; x++) {
    const v = 128 + 110 * Math.sin((x / 256) * Math.PI * 2 * 8);
    ctx.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`; ctx.fillRect(x, 0, 1, 256);
  }
  const bump = tex(c, { srgb: false });
  const [c2, ctx2] = canvas(512);
  ctx2.fillStyle = '#3d4040'; ctx2.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) blotch(ctx2, 512, rr(0, 512), rr(0, 512), rr(10, 80), `rgba(${rand() < 0.6 ? '90,45,20' : '0,0,0'},${rr(0.1, 0.35)})`); // rust
  noise(ctx2, 512, 512, 18);
  return { bump, map: tex(c2) };
}

export function windowTexture() {
  const [c, ctx] = canvas(512, 256);
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 512, 256);
  const cols = 8, rows = 3, pw = 512 / cols, ph = 256 / rows;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const broken = rand() < 0.18, v = broken ? 0 : rr(0.35, 1);
    const g = ctx.createLinearGradient(0, y * ph, 0, (y + 1) * ph);
    g.addColorStop(0, `rgba(${60 * v},${90 * v},${140 * v},1)`); g.addColorStop(1, `rgba(${25 * v},${40 * v},${70 * v},1)`);
    ctx.fillStyle = g; ctx.fillRect(x * pw + 5, y * ph + 5, pw - 10, ph - 10);
    if (!broken) for (let k = 0; k < 6; k++) blotch(ctx, 4096, x * pw + rr(0, pw), y * ph + rr(0, ph), rr(5, 25), 'rgba(0,0,0,0.5)');
  }
  return tex(c, { repeat: true });
}

export function graffitiTexture(text, color, sub) {
  const [c, ctx] = canvas(1024, 512);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'italic 900 190px Impact, "Arial Black", "DejaVu Sans", sans-serif';
  ctx.lineJoin = 'round';
  ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.lineWidth = 22; ctx.strokeStyle = 'rgba(10,10,10,0.9)'; ctx.strokeText(text, 512, 230);
  ctx.fillStyle = color; ctx.fillText(text, 512, 230);
  ctx.shadowBlur = 0;
  // drips
  ctx.fillStyle = color;
  for (let i = 0; i < 18; i++) { const x = rr(180, 850); ctx.fillRect(x, rr(270, 300), rr(3, 6), rr(20, 110)); }
  if (sub) { ctx.font = 'bold 60px "DejaVu Sans", sans-serif'; ctx.fillStyle = 'rgba(230,230,230,0.8)'; ctx.fillText(sub, 560, 410); }
  // weathering: punch holes
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 1400; i++) { ctx.fillStyle = `rgba(0,0,0,${rr(0.2, 0.9)})`; ctx.fillRect(rr(0, 1024), rr(0, 512), rr(1, 6), rr(1, 6)); }
  return tex(c, { repeat: false });
}

export function radialTexture(inner = 'rgba(0,0,0,1)', outer = 'rgba(0,0,0,0)', size = 128) {
  const [c, ctx] = canvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return tex(c, { srgb: false, repeat: false });
}

export function smokeTexture(size = 256) {
  const [c, ctx] = canvas(size);
  for (let i = 0; i < 40; i++) {
    const x = size / 2 + rr(-50, 50), y = size / 2 + rr(-50, 50), r = rr(30, 90);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${rr(0.04, 0.12)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  }
  return tex(c, { srgb: false, repeat: false });
}
