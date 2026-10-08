// DJ booth, subs (+ optional tops) — built from the layout config. Monitors: monitors.js, flown hangs: lineArray.js.
import * as THREE from 'three';
import { MODELS, BOOTH, SUB_LAYOUT, SUB_LAYOUTS } from './layout.js';
import { radialTexture } from './textures.js';
import { modelUrl } from './assets.js';

// Load a GLB and normalize: real-world size, pivot at bottom-center (unless keepOrigin).
export async function loadModel(loader, def) {
  const gltf = await loader.loadAsync(modelUrl(def.url));
  const inner = gltf.scene;
  inner.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    if (def.tint != null) for (const m of [o.material].flat()) m.color?.multiplyScalar(def.tint);
  });
  let box = new THREE.Box3().setFromObject(inner, true);
  const size = box.getSize(new THREE.Vector3());
  const s = def.scale ?? (def.height ? def.height / size.y : 1);
  inner.scale.multiplyScalar(s);
  box = new THREE.Box3().setFromObject(inner, true);
  if (!def.keepOrigin) {
    const c = box.getCenter(new THREE.Vector3());
    inner.position.x -= c.x; inner.position.z -= c.z; inner.position.y -= box.min.y;
    box = new THREE.Box3().setFromObject(inner, true);
  }
  const g = new THREE.Group(); g.add(inner);
  g.userData.size = box.getSize(new THREE.Vector3());
  g.userData.box = box;
  if (def.animate && gltf.animations.length) g.userData.animations = gltf.animations;
  return g;
}

// Clone a loaded model; if it carries animation clips, drive the clone with its own mixer
// (clips bind by node name, which clone() preserves). Mixers are collected on `rig.userData.mixers`.
function cloneModel(model, mixers) {
  const clone = model.clone();
  const clips = model.userData.animations;
  if (clips?.length && mixers) {
    const mixer = new THREE.AnimationMixer(clone);
    for (const clip of clips) mixer.clipAction(clip).play();
    mixers.push(mixer);
  }
  return clone;
}

const blobTex = radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
export function blobShadow(w, d, opacity = 0.75) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({
    color: 0x000000, alphaMap: blobTex, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
  }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.004; m.renderOrder = 1;
  return m;
}

export function buildRig(models) {
  const rig = new THREE.Group(); rig.name = 'rig';
  const mixers = []; rig.userData.mixers = mixers;
  const blackPaint = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 });
  const plyMat = new THREE.MeshStandardMaterial({ color: 0x0e0d0c, roughness: 0.9 });

  // riser
  const [rw, rh, rd] = BOOTH.riser.size;
  const riser = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, rd), blackPaint);
  riser.position.set(BOOTH.riser.position[0], rh / 2, BOOTH.riser.position[2]);
  riser.castShadow = riser.receiveShadow = true; rig.add(riser);
  const rs = blobShadow(rw * 1.25, rd * 1.3, 0.8); rs.position.x = riser.position.x; rs.position.z = riser.position.z; rig.add(rs);

  // LED strip on the riser front (animated in main loop)
  const led = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: 0xff2000 }));
  led.position.set(riser.position.x, rh - 0.05, riser.position.z + rd / 2 + 0.011);
  led.name = 'riserLED'; rig.add(led);

  // table
  const [tw, th, td] = BOOTH.table.size;
  const table = new THREE.Group();
  table.position.fromArray(BOOTH.table.position);
  const top = new THREE.Mesh(new THREE.BoxGeometry(tw, 0.04, td), plyMat);
  top.position.y = th - 0.02; table.add(top);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(tw, th - 0.04, 0.02), blackPaint); // front panel facing crowd
  skirt.position.set(0, (th - 0.04) / 2, td / 2 - 0.01); table.add(skirt);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.03, th - 0.04, td), blackPaint);
    side.position.set(sx * (tw / 2 - 0.015), (th - 0.04) / 2, 0); table.add(side);
  }
  // flight-case style aluminium edge trims
  const trim = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, metalness: 0.9, roughness: 0.4 });
  const e = 0.025;
  for (const [sx, sy, sz, px, py, pz] of [
    [tw + e, e, e, 0, th, td / 2], [tw + e, e, e, 0, th, -td / 2], [tw + e, e, e, 0, e / 2, td / 2],
    [e, th, e, -tw / 2, th / 2, td / 2], [e, th, e, tw / 2, th / 2, td / 2], [e, e, td, -tw / 2, th, 0], [e, e, td, tw / 2, th, 0],
  ]) { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), trim); m.position.set(px, py, pz); table.add(m); }
  for (const sx of [-1, 1]) { // corner caps
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), trim); cap.position.set(sx * tw / 2, th - 0.01, td / 2); table.add(cap);
  }
  table.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  rig.add(table);

  // DJ gear (2x CDJ + mixer) on the table
  if (models.djSetup) {
    const dj = models.djSetup.clone();
    dj.position.set(BOOTH.djSetup.offset[0], th + BOOTH.djSetup.offset[1], BOOTH.djSetup.offset[2]);
    dj.rotation.y = BOOTH.djSetup.rotY; table.add(dj);
  } else {
    const [mw, mh, md] = BOOTH.placeholderMixer.size;
    const mix = new THREE.Mesh(new THREE.BoxGeometry(mw, mh, md), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5, roughness: 0.4 }));
    mix.position.y = th + mh / 2; table.add(mix);
  }

  const lamp = new THREE.PointLight(0xffd2a0, BOOTH.deskLamp.intensity, 2.5, 1.5);
  lamp.position.fromArray(BOOTH.deskLamp.position); rig.add(lamp);

  // subs (optionally laid on their side) + tops (none in the current layouts)
  const L = SUB_LAYOUTS[SUB_LAYOUT];
  const sz = models.sub?.userData.size ?? new THREE.Vector3(0.8, 0.95, 1.0);
  const subH = sz.y, subD = sz.z;
  for (const s of L.subs) {
    const lay = !!s.lay, h = lay ? sz.x : sz.y, w = lay ? sz.y : sz.x;
    const g = new THREE.Group(); g.position.set(s.x, s.level * h, s.z); g.rotation.y = s.rotY;
    const m = models.sub ? models.sub.clone() : new THREE.Mesh(new THREE.BoxGeometry(sz.x, sz.y, sz.z), blackPaint);
    if (!models.sub) m.position.y = sz.y / 2;
    if (lay) { // roll 90° about the front axis around the cabinet centre, then sit it back on the floor
      const pivot = new THREE.Group(); pivot.position.y = h / 2; pivot.rotation.z = Math.PI / 2;
      m.position.y -= sz.y / 2; pivot.add(m); g.add(pivot);
    } else g.add(m);
    g.name = 'sub'; rig.add(g);
    if (s.level === 0) { const b = blobShadow(w * 1.4, subD * 1.45); b.position.set(s.x, 0.004, s.z); b.rotation.z = s.rotY; rig.add(b); }
  }
  for (const t of L.tops ?? []) {
    const g = new THREE.Group(); g.position.set(t.x, 0, t.z); g.rotation.y = t.rotY; g.name = 'top';
    let elev = 0;
    if (t.onSubs) elev = t.onSubs * subH;
    else if (t.standHeight) {
      elev = t.standHeight;
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.7, elev, 0.6), blackPaint);
      plinth.position.y = elev / 2; g.add(plinth);
      const b = blobShadow(1.1, 1.0); b.position.set(t.x, 0.004, t.z); rig.add(b);
    }
    const top = models.top ? cloneModel(models.top, mixers) : new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.5), blackPaint);
    top.position.y = elev;
    if (t.frontAlign && models.top) top.position.z = (subD - models.top.userData.size.z) / 2;
    g.add(top); rig.add(g);
    if (!t.onSubs && !t.standHeight && models.top) { // straight on the floor: ground it with a soft shadow
      const sz = models.top.userData.size;
      const b = blobShadow(sz.x * 1.15, sz.z * 1.25); b.position.set(t.x, 0.004, t.z); b.rotation.z = t.rotY; rig.add(b);
    }
  }
  return rig;
}
