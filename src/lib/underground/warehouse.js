// Warehouse venue: loads public/models/warehouse.glb if present, otherwise builds
// a procedural placeholder (concrete floor, brick walls, steel columns, roof trusses).
import * as THREE from 'three';
import { WAREHOUSE } from './layout.js';
import { loadOptionalGLB } from './optional.js';
import { concreteTextures, brickTexture, corrugatedTextures, windowTexture, graffitiTexture, rand } from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ── beams: every straight steel member becomes one instance of a unit box ──
export function beamsMesh(list, material) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), dir = V(), mid = V(), s = V();
  list.forEach(([a, b, tx, tz = tx], i) => {
    dir.subVectors(b, a); const len = dir.length(); dir.normalize();
    q.setFromUnitVectors(up, dir); mid.addVectors(a, b).multiplyScalar(0.5);
    s.set(tx, len, tz); m.compose(mid, q, s); mesh.setMatrixAt(i, m);
  });
  return mesh;
}

// plane with UVs in world units / tile
function wallPlane(w, h, tile, material) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * h) / tile);
  return new THREE.Mesh(g, material);
}

export function buildProceduralWarehouse() {
  const { width: W, length: L, eaveHeight: E, ridgeHeight: R, bays, skylightBays } = WAREHOUSE;
  const g = new THREE.Group(); g.name = 'procedural-warehouse';

  // floor
  const conc = concreteTextures();
  conc.map.repeat.set(W / 4, L / 4);
  const floorMat = new THREE.MeshStandardMaterial({ map: conc.map, roughnessMap: conc.rough, roughness: 1.0, metalness: 0.0, color: 0x8a8782 });
  const floor = wallPlane(W, L, 1, floorMat); // uv 0..W, 0..L → map repeat handled below
  floor.geometry = new THREE.PlaneGeometry(W, L);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.name = 'floor';
  g.add(floor);

  // walls (brick) + concrete plinth band
  const brick = brickTexture();
  const brickMat = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.95, color: 0x9a9088 });
  const plinthMap = conc.map.clone(); plinthMap.repeat.set(1, 1); plinthMap.needsUpdate = true;
  const plinthMat = new THREE.MeshStandardMaterial({ map: plinthMap, roughness: 0.95, color: 0x6a6660 });
  const T = 2.0; // brick tile size in m
  const addWall = (w, h, pos, rotY) => {
    const m = wallPlane(w, h, T, brickMat); m.position.copy(pos); m.rotation.y = rotY; g.add(m);
    const p = wallPlane(w, 1.2, 4, plinthMat); p.position.copy(pos).setY(0.6); p.rotation.y = rotY;
    p.translateZ(0.03); g.add(p);
  };
  addWall(L, E, V(-W / 2, E / 2, 0), Math.PI / 2);
  addWall(L, E, V(W / 2, E / 2, 0), -Math.PI / 2);
  addWall(W, E, V(0, E / 2, -L / 2), 0);
  addWall(W, E, V(0, E / 2, L / 2), Math.PI);
  // gables (triangles above eave)
  const shape = new THREE.Shape([new THREE.Vector2(-W / 2, E), new THREE.Vector2(W / 2, E), new THREE.Vector2(0, R)]);
  const gg = new THREE.ShapeGeometry(shape);
  const uv = gg.attributes.uv, pos = gg.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / T, pos.getY(i) / T);
  const gab1 = new THREE.Mesh(gg, brickMat); gab1.position.z = -L / 2; g.add(gab1);
  const gab2 = new THREE.Mesh(gg, brickMat); gab2.position.z = L / 2; gab2.rotation.y = Math.PI; g.add(gab2);

  // clerestory windows on the side walls (dim night-sky glow, some panes broken)
  const winTex = windowTexture();
  const winMat = new THREE.MeshStandardMaterial({ map: winTex, emissiveMap: winTex, emissive: 0x5577aa, emissiveIntensity: 0.6, roughness: 0.4 });
  const bayLen = L / bays;
  for (let b = 0; b < bays; b++) for (const side of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(bayLen * 0.7, 1.6), winMat);
    w.position.set(side * (W / 2 - 0.02), 6.1, -L / 2 + bayLen * (b + 0.5));
    w.rotation.y = -side * Math.PI / 2; g.add(w);
  }

  // steel: columns (I-beams), trusses, purlins
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x3b3632, roughness: 0.6, metalness: 0.6 });
  const beams = [];
  for (let i = 0; i <= bays; i++) {
    const z = -L / 2 + i * bayLen + (i === 0 ? 0.25 : i === bays ? -0.25 : 0);
    for (const s of [-1, 1]) { // I-beam column = 2 flanges + web
      const x = s * (W / 2 - 0.25);
      beams.push([V(x - s * 0.15, 0, z), V(x - s * 0.15, E, z), 0.03, 0.3]);
      beams.push([V(x + s * 0.15, 0, z), V(x + s * 0.15, E, z), 0.03, 0.3]);
      beams.push([V(x, 0, z), V(x, E, z), 0.3, 0.02]);
    }
    // Warren/Pratt truss
    const N = 8, half = W / 2 - 0.1, t = 0.12;
    const top = (x) => E + (R - E - 0.3) * (1 - Math.abs(x) / half);
    beams.push([V(-half, E, z), V(half, E, z), t]);
    beams.push([V(-half, E, z), V(0, top(0), z), t]);
    beams.push([V(0, top(0), z), V(half, E, z), t]);
    for (let k = 0; k < N; k++) for (const s of [-1, 1]) {
      const x0 = s * half * (1 - k / N), x1 = s * half * (1 - (k + 1) / N);
      beams.push([V(x1, E, z), V(x1, top(x1), z), 0.07]);
      beams.push([V(x0, E, z), V(x1, top(x1), z), 0.07]);
    }
  }
  // purlins along the roof + eave ties
  for (let k = 0; k <= 6; k++) for (const s of [-1, 1]) {
    const x = s * (W / 2 - 0.1) * (k / 6), y = E + (R - E - 0.3) * (1 - k / 6) + 0.1;
    beams.push([V(x, y, -L / 2), V(x, y, L / 2), 0.1, 0.16]);
  }
  // glowing LED tubes strapped to the columns (red / UV), for depth along the walls
  for (let i = 1; i < bays; i++) for (const sd of [-1, 1]) {
    const c = (i + (sd > 0 ? 1 : 0)) % 2 ? new THREE.Color(2.2, 0.05, 0.02) : new THREE.Color(0.9, 0.1, 2.4);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8), new THREE.MeshBasicMaterial({ color: c }));
    tube.position.set(sd * (W / 2 - 0.45), 3.4, -L / 2 + i * bayLen); g.add(tube);
  }
  const steel = beamsMesh(beams, steelMat); steel.name = 'steel'; g.add(steel);

  // roof: corrugated metal with dirty skylight strips in some bays
  const corr = corrugatedTextures();
  const roofMat = new THREE.MeshStandardMaterial({ map: corr.map, bumpMap: corr.bump, bumpScale: 2, roughness: 0.7, metalness: 0.5, color: 0x777777, side: THREE.DoubleSide });
  const skyMat = new THREE.MeshStandardMaterial({ color: 0x223044, emissive: 0x3a5a88, emissiveIntensity: 0.45, roughness: 0.3, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const slopeLen = Math.hypot(W / 2, R - E), ang = Math.atan2(R - E, W / 2);
  for (const s of [-1, 1]) for (let b = 0; b < bays; b++) {
    const zc = -L / 2 + bayLen * (b + 0.5);
    const segs = skylightBays.includes(b) ? [[0, 0.4, roofMat], [0.4, 0.62, skyMat], [0.62, 1, roofMat]] : [[0, 1, roofMat]];
    for (const [a, c, mat] of segs) {
      const len = (c - a) * slopeLen;
      const geo = new THREE.PlaneGeometry(bayLen, len);
      if (mat === roofMat) { const u = geo.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * bayLen / 2, u.getY(i) * len / 2); }
      const p = new THREE.Mesh(geo, mat);
      const mid = (a + c) / 2 * slopeLen;
      p.position.set(s * (W / 2 - Math.cos(ang) * mid), E + 0.3 + Math.sin(ang) * mid, zc);
      p.rotation.order = 'YXZ'; p.rotation.y = s * Math.PI / 2; p.rotation.x = -(Math.PI / 2 - ang);
      g.add(p);
      if (mat === skyMat) p.userData.skylight = true;
    }
  }
  corr.map.repeat.set(1, 1); corr.bump.repeat.set(1, 1);

  // roll-up door on the right wall + exit sign
  const doorTex = corrugatedTextures();
  const doorMat = new THREE.MeshStandardMaterial({ map: doorTex.map, bumpMap: doorTex.bump, bumpScale: 3, color: 0x556060, roughness: 0.6, metalness: 0.6 });
  doorTex.bump.rotation = Math.PI / 2; doorTex.bump.repeat.set(1, 2.5);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(5, 4.5), doorMat);
  door.position.set(W / 2 - 0.04, 2.25, 8); door.rotation.y = -Math.PI / 2; g.add(door);
  const exit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.06), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 2.2, 0.5) }));
  exit.position.set(W / 2 - 0.08, 4.9, 8); exit.rotation.y = -Math.PI / 2; g.add(exit);

  // graffiti on the walls
  const tags = [
    ['TECHNO', '#ff3b7a', 'SEM FIM ATÉ O SOL', V(-W / 2 + 0.05, 2.4, 2), Math.PI / 2, 6],
    ['RAVE', '#35e0ff', '128 BPM', V(W / 2 - 0.05, 2.2, -4), -Math.PI / 2, 5],
    ['UNDERGRND', '#ffd23b', null, V(-W / 2 + 0.05, 2.0, 14), Math.PI / 2, 6],
  ];
  for (const [txt, col, sub, p, ry, w] of tags) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 2), new THREE.MeshStandardMaterial({
      map: graffitiTexture(txt, col, sub), transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    }));
    m.position.copy(p); m.rotation.y = ry; g.add(m);
  }

  // props: pallets + oil drums along the walls
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b5236, roughness: 0.95 });
  const pallets = [[-10.3, 6], [-10.3, 7.4], [10.2, 15], [-9.8, 17.5], [9.6, -10.5]];
  for (const [x, z] of pallets) {
    const n = 2 + Math.floor(rand() * 5);
    for (let i = 0; i < n; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 1.0), wood);
      p.position.set(x + (rand() - 0.5) * 0.1, 0.07 + i * 0.15, z + (rand() - 0.5) * 0.1); p.rotation.y = (rand() - 0.5) * 0.15; g.add(p);
    }
  }
  const drumCols = [0x5a1a14, 0x1c3550, 0x2c2c2c, 0x6a4a18];
  const drums = [[-10.8, -2], [-10.2, -1.6], [-10.9, -1.1], [10.8, 3], [10.9, 2.3], [10.8, -12.7], [-10.6, 10.5], [-10.9, -14]];
  for (const [x, z] of drums) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 20),
      new THREE.MeshStandardMaterial({ color: drumCols[(rand() * 4) | 0], roughness: 0.55, metalness: 0.6 }));
    d.position.set(x, 0.44, z); g.add(d);
  }
  return g;
}

// Try public/models/warehouse.glb (Vite serves index.html for missing files, so check magic bytes).
export async function loadWarehouseGLB(loader, probe = WAREHOUSE.glb.autoDetect !== false) {
  if (!probe) return null;
  const gltf = await loadOptionalGLB(loader, WAREHOUSE.glb.url);
  if (!gltf) return null;
  const root = new THREE.Group(); root.name = 'warehouse-glb';
  const inner = gltf.scene; inner.rotation.y = WAREHOUSE.glb.rotationY; root.add(inner);
  let box = new THREE.Box3().setFromObject(root, true);
  const size = box.getSize(V());
  if (WAREHOUSE.glb.fitLength) inner.scale.multiplyScalar(WAREHOUSE.glb.fitLength / Math.max(size.x, size.z));
  box = new THREE.Box3().setFromObject(root, true);
  const c = box.getCenter(V());
  inner.position.x -= c.x; inner.position.z -= c.z; inner.position.y -= box.min.y;
  root.position.fromArray(WAREHOUSE.glb.offset);
  const { emissive, emissiveGamma, tint, metalness, skylight } = WAREHOUSE.glb;
  // One colour drives everything that reads as "light coming through the skylights": the panel seen
  // through the slots and the baked light pool on the floor. app.js animates it (`setSkyColor`).
  const skyColor = new THREE.Color(1, 1, 1);
  const skyUniform = { value: skyColor };
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.receiveShadow = true;
    // Sketchfab interiors ship with a baked (daylight) lightmap in the emissive slot; dim it so the
    // club lighting reads, and tone down the metallic concrete which has no environment to reflect.
    for (const m of [o.material].flat()) {
      if (!m) continue;
      if (emissive != null && 'emissiveIntensity' in m) m.emissiveIntensity = emissive;
      if (tint != null) m.color?.multiplyScalar(tint);
      if (metalness != null && 'metalness' in m) m.metalness = Math.min(m.metalness, metalness);
      if (m.emissiveMap) {
        // Baked lightmap → tinted by the skylight colour; the power curve keeps only the light pools
        // (the lit-grey concrete would otherwise feed the bloom and wash the frame out).
        const gamma = emissiveGamma || 1;
        m.onBeforeCompile = (shader) => {
          shader.uniforms.uSkyColor = skyUniform;
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nuniform vec3 uSkyColor;')
            .replace(
              '#include <emissivemap_fragment>',
              `#ifdef USE_EMISSIVEMAP
                vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
                totalEmissiveRadiance *= pow( emissiveColor.rgb, vec3( ${gamma.toFixed(2)} ) ) * uSkyColor;
              #endif`,
            );
        };
        m.customProgramCacheKey = () => `venue-emissive-${gamma}`;
        m.needsUpdate = true;
      }
    }
  });
  // Light panel above the ceiling: the skylight slots are open, so this is what you see through them.
  // Plain colour > 1 so the bloom picks it up like a real light box.
  if (skylight) {
    const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: true });
    const dims = box.getSize(V());
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(dims.x * 1.2, dims.z * 1.2), panelMat);
    panel.name = 'skylight-panel';
    panel.rotation.x = Math.PI / 2; // face down
    panel.position.set(0, dims.y - (skylight.depth ?? 0.3), 0);
    root.add(panel);
    const gain = skylight.intensity ?? 2.5;
    root.userData.skylight = { panel, mat: panelMat, gain };
  }
  root.userData.setSkyColor = (color, pulse = 1) => {
    skyColor.copy(color);
    const sk = root.userData.skylight;
    if (sk) sk.mat.color.copy(color).multiplyScalar(sk.gain * pulse);
  };
  return root;
}
