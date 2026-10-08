// Flown line-array hangs (one per side of the stage, above the outer subs), built procedurally:
// a fly bar on two chain hoists from the ceiling and a J-curve of wedge-shaped cabinets
// (perforated front grille, side waveguide cheeks, front rigging links, small white status LED).
// Everything is configured in layout.js → LINE_ARRAY. createCabinetBuilder() is also used by the
// DJ monitors (monitors.js).
import * as THREE from 'three';
import { LINE_ARRAY, WAREHOUSE } from './layout.js';

function canvasTex(w, h, draw, { srgb = true, repeat = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// perforated steel grille (hex hole pattern) with a thin frame
function grilleTexture(cw = 512, ch = 160) {
  return canvasTex(cw, ch, (ctx, w, h) => {
    ctx.fillStyle = '#202124'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#050506';
    const s = 5;
    for (let y = 4, r = 0; y < h - 2; y += s * 0.87, r++) {
      for (let x = 4 + (r % 2) * s * 0.5; x < w - 2; x += s) { ctx.beginPath(); ctx.arc(x, y, 1.55, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.strokeStyle = '#3a3b3f'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, w - 6, h - 6);
  });
}

// side cheek: rigging plate + a large waveguide opening, like the reference model
function cheekTexture() {
  return canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#18191b'; ctx.fillRect(0, 0, w, h);
    // waveguide (towards the front = right side of the texture)
    const cx = w * 0.7, cy = h * 0.5, rx = w * 0.2, ry = h * 0.36;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, ry * 1.2);
    g.addColorStop(0, '#000'); g.addColorStop(0.65, '#0c0c0d'); g.addColorStop(1, '#2c2d30');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#46474c'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = '#2a2b2e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy - ry * 0.9); ctx.lineTo(cx, cy + ry * 0.9); ctx.stroke();
    // rigging plate + bolts at the back
    ctx.fillStyle = '#323438'; ctx.fillRect(w * 0.06, h * 0.12, w * 0.22, h * 0.76);
    ctx.fillStyle = '#6a6c72';
    for (const [x, y] of [[0.1, 0.22], [0.24, 0.22], [0.1, 0.78], [0.24, 0.78], [0.17, 0.5]]) { ctx.beginPath(); ctx.arc(w * x, h * y, 3, 0, Math.PI * 2); ctx.fill(); }
  });
}

// small red logo badge (no brand name), for the monitor cabinets' grilles
function badgeTexture() {
  return canvasTex(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#d0121b'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ff5a5f'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.16, 0, Math.PI * 2); ctx.fill();
  });
}

let shared = null; // materials + textures shared by every cabinet (hangs and monitors)
export function speakerMaterials() {
  if (shared) return shared;
  shared = {
    shell: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.55, metalness: 0.15 }),
    grille: new THREE.MeshStandardMaterial({ map: grilleTexture(), roughness: 0.55, metalness: 0.35 }),
    subGrille: new THREE.MeshStandardMaterial({ map: grilleTexture(300, 300), roughness: 0.6, metalness: 0.3 }), // monitor subs
    cheek: new THREE.MeshStandardMaterial({ map: cheekTexture(), roughness: 0.6, metalness: 0.3 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x3c3e42, roughness: 0.45, metalness: 0.6 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x1d1e21, roughness: 0.5, metalness: 0.6 }),
    led: new THREE.MeshBasicMaterial({ color: 0xeef4ff }),
    badge: new THREE.MeshStandardMaterial({ map: badgeTexture(), roughness: 0.4, emissive: 0x400000 }),
  };
  return shared;
}

// Returns a factory for one wedge cabinet of the given size ({ w, h, d, backH }).
// Cabinet origin = front-top edge, front faces +Z, body hangs down (-Y) and back (-Z).
// opts.badge: size (m) of a red logo badge centred on the grille (0 = none); opts.links: rigging links.
export function createCabinetBuilder({ w, h, d, backH }, { badge = 0, links = true, led = true } = {}) {
  const M = speakerMaterials();
  const prof = new THREE.Shape();
  prof.moveTo(0, 0); prof.lineTo(-d, 0); prof.lineTo(-d, -backH); prof.lineTo(0, -h); prof.closePath();
  const bev = Math.min(0.006, h * 0.03);
  const cab = new THREE.ExtrudeGeometry(prof, { depth: w * 0.94, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1 });
  cab.rotateY(-Math.PI / 2); cab.translate(w * 0.47, 0, 0); // extrude axis → X, centred
  const cheekGeo = new THREE.ShapeGeometry(prof);
  { // normalise the cheek UVs to the profile bounds
    const uv = cheekGeo.attributes.uv, p = cheekGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + d) / d, (p.getY(i) + h) / h);
  }
  const grilleGeo = new THREE.PlaneGeometry(w * 0.9, h * 0.84);
  const linkGeo = new THREE.BoxGeometry(0.025, h * 0.33, 0.03);
  const ledGeo = new THREE.PlaneGeometry(0.018, 0.018);
  const badgeGeo = badge ? new THREE.PlaneGeometry(badge, badge) : null;

  return function cabinet() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(cab, M.shell));
    for (const sx of [-1, 1]) {
      const ch = new THREE.Mesh(cheekGeo, M.cheek);
      ch.rotation.y = sx * Math.PI / 2; ch.position.x = sx * (w * 0.47 + bev + 0.0015);
      if (sx < 0) { ch.scale.x = -1; } // keep the waveguide towards the front on both sides
      g.add(ch);
      if (links) {
        const link = new THREE.Mesh(linkGeo, M.steel); link.position.set(sx * (w * 0.47 + 0.02), -h + 0.01, -0.03); g.add(link);
        const linkB = new THREE.Mesh(linkGeo, M.steel); linkB.position.set(sx * (w * 0.47 + 0.02), -backH + 0.01, -d + 0.04); g.add(linkB);
      }
    }
    const gr = new THREE.Mesh(grilleGeo, M.grille); gr.position.set(0, -h / 2, bev + 0.0015); g.add(gr);
    if (led) { const l = new THREE.Mesh(ledGeo, M.led); l.position.set(-w * 0.39, -h * 0.78, bev + 0.003); g.add(l); }
    if (badgeGeo) { const b = new THREE.Mesh(badgeGeo, M.badge); b.position.set(0, -h / 2, bev + 0.003); g.add(b); }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  };
}

export function buildLineArrays() {
  const cfg = LINE_ARRAY;
  const root = new THREE.Group(); root.name = 'lineArrays';
  if (!cfg?.enabled) return root;
  const { w, h, d } = cfg.box;
  const ceilingY = cfg.ceilingY ?? WAREHOUSE.eaveHeight;
  const { steel: steelMat, darkSteel } = speakerMaterials();
  const cabinet = createCabinetBuilder(cfg.box);

  for (const hang of cfg.hangs) {
    const g = new THREE.Group(); g.name = 'lineArrayHang';
    g.position.set(hang.x, cfg.topY, hang.z); g.rotation.y = hang.rotY ?? 0;
    // fly bar + hoist chains up to the ceiling
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08, 0.055, d * 1.05), darkSteel);
    bar.position.set(0, 0.045, -d / 2); g.add(bar);
    for (const sx of [-1, 1]) {
      const x = sx * w * 0.38, len = Math.max(0.05, ceilingY - cfg.topY - 0.07);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, len, 6), steelMat);
      chain.position.set(x, 0.07 + len / 2, -d / 2); g.add(chain);
      const hoist = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), darkSteel);
      hoist.position.set(x, ceilingY - cfg.topY - 0.13, -d / 2); g.add(hoist);
    }
    // J-curve: each cabinet hinges on the front-bottom edge of the one above
    let parent = g, angle = hang.tilt ?? 0;
    const splay = cfg.splayDeg;
    for (let i = 0; i < cfg.count; i++) {
      const c = cabinet();
      const a = THREE.MathUtils.degToRad(i === 0 ? angle : splay[Math.min(i - 1, splay.length - 1)]);
      if (i === 0) c.rotation.x = a;
      else { c.position.set(0, -h - cfg.gap, 0); c.rotation.x = a; }
      parent.add(c); parent = c;
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    root.add(g);
  }
  return root;
}
