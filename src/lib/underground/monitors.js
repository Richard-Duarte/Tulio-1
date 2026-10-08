// DJ monitors ("retornos"): one stack per side of the booth, aimed at the DJ. Each stack is a compact
// sub on the riser floor (perforated grille, side handle cutouts, pole socket on top, small red badge),
// a black pole from the sub's top centre and two compact line-array cells (same wedge cabinet as the
// flown hangs, see lineArray.js) on a yoke, with a slight downward J-curve. Config: layout.js → MONITORS.
import * as THREE from 'three';
import { MONITORS, BOOTH } from './layout.js';
import { createCabinetBuilder, speakerMaterials } from './lineArray.js';
import { blobShadow } from './rig.js';

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function buildMonitors() {
  const cfg = MONITORS;
  const root = new THREE.Group(); root.name = 'monitors';
  if (!cfg?.enabled) return root;
  const M = speakerMaterials();
  const floorY = BOOTH.riser.size[1];
  const { w: sw, h: sh, d: sd } = cfg.sub;
  const cell = cfg.cell;
  const cabinet = createCabinetBuilder(cell, { badge: 0.024, links: true, led: false });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.35, metalness: 0.5 });
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 1, side: THREE.DoubleSide });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.95 });

  const subBody = new THREE.BoxGeometry(sw, sh, sd);
  const subGrille = new THREE.PlaneGeometry(sw * 0.9, sh * 0.86);
  const handle = new THREE.ShapeGeometry(roundedRect(0.16, 0.05, 0.022), 6);
  const badge = new THREE.PlaneGeometry(0.035, 0.035);
  const foot = new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10);
  const socket = new THREE.CylinderGeometry(0.035, 0.04, 0.035, 16);
  const pole = new THREE.CylinderGeometry(0.018, 0.018, cfg.poleLength, 12);
  const yoke = new THREE.BoxGeometry(0.09, 0.03, 0.09);
  const yokePlate = new THREE.BoxGeometry(cell.w * 0.55, 0.012, cell.d * 0.6);
  const aim = new THREE.Vector3().fromArray(cfg.aimAt);
  const cellsH = 2 * cell.h; // approx height of the two-cell block

  for (const [x, z] of cfg.positions) {
    const g = new THREE.Group(); g.name = 'monitor';
    g.position.set(x, floorY, z);
    g.rotation.y = Math.atan2(aim.x - x, aim.z - z); // local +Z (speaker front) → DJ

    // sub
    const sub = new THREE.Group(); sub.position.y = 0.02; g.add(sub);
    const body = new THREE.Mesh(subBody, M.shell); body.position.y = sh / 2; sub.add(body);
    const gr = new THREE.Mesh(subGrille, M.subGrille); gr.position.set(0, sh * 0.5, sd / 2 + 0.002); sub.add(gr);
    const b = new THREE.Mesh(badge, M.badge); b.position.set(0, sh * 0.11, sd / 2 + 0.004); sub.add(b);
    for (const sx of [-1, 1]) {
      const hd = new THREE.Mesh(handle, holeMat);
      hd.rotation.y = sx * Math.PI / 2; hd.position.set(sx * (sw / 2 + 0.002), sh * 0.62, -sd * 0.05); sub.add(hd);
      for (const fz of [-1, 1]) { const f = new THREE.Mesh(foot, rubber); f.position.set(sx * sw * 0.38, -0.01, fz * sd * 0.38); sub.add(f); }
    }
    const so = new THREE.Mesh(socket, poleMat); so.position.y = sh + 0.017; sub.add(so);
    const p = new THREE.Mesh(pole, poleMat); p.position.y = sh + cfg.poleLength / 2; sub.add(p);

    // cells on a yoke at the pole top, pitched down towards the DJ's head
    const top = 0.02 + sh + cfg.poleLength;
    const y1 = new THREE.Mesh(yoke, poleMat); y1.position.y = top - 0.015; g.add(y1);
    const pivot = new THREE.Group(); pivot.position.y = top; g.add(pivot);
    const centre = new THREE.Vector3(x, floorY + top + cellsH / 2, z);
    const dist = Math.hypot(aim.x - x, aim.z - z);
    pivot.rotation.x = Math.atan2(centre.y - aim.y, dist) + THREE.MathUtils.degToRad(2);
    const plate = new THREE.Mesh(yokePlate, poleMat); plate.position.y = 0.006; pivot.add(plate);
    const c1 = cabinet(); c1.position.set(0, 0.012 + cellsH + 0.006, cell.d / 2); pivot.add(c1);
    const c2 = cabinet(); c2.position.set(0, -cell.h - 0.006, 0); c2.rotation.x = THREE.MathUtils.degToRad(cfg.splayDeg); c1.add(c2);

    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    root.add(g);
    const sh2 = blobShadow(sw * 1.6, sd * 1.6, 0.7); sh2.position.set(x, floorY + 0.004, z); sh2.rotation.z = g.rotation.y; root.add(sh2);
  }
  return root;
}
