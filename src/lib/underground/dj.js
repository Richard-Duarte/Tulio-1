// DJ behind the decks: public/models/dj.glb if present, else a dark humanoid silhouette.
//  • glb with animation clips → plays the first clip (or BOOTH.dj.clipName) via AnimationMixer
//  • glb with mixamo-style bones but no clips → procedural club-DJ animation (djRig.js)
//  • glb without bones → whole-model bob / nod
import * as THREE from 'three';
import { BOOTH } from './layout.js';
import { loadOptionalGLB } from './optional.js';
import { findBones, hasDJBones, createDJDriver, rotateBoneWorld } from './djRig.js';

// Articulated silhouette whose joints use mixamo names, so the same procedural driver animates it.
function placeholder() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.8 });
  const phonesMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.5 });
  const J = (name, parent, x, y, z) => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g; };
  const M = (geo, parent, x = 0, y = 0, z = 0, m = mat) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  const root = new THREE.Group();
  const hips = J('Hips', root, 0, 0.95, 0);
  for (const sx of [-1, 1]) M(new THREE.CapsuleGeometry(0.078, 0.72, 3, 8), hips, sx * 0.1, -0.47, 0);
  M(new THREE.CapsuleGeometry(0.16, 0.12, 3, 10), hips, 0, 0.02, 0).scale.set(1.1, 1, 0.75);
  const spine = J('Spine', hips, 0, 0.1, 0);
  const spine1 = J('Spine1', spine, 0, 0.18, 0);
  M(new THREE.CapsuleGeometry(0.19, 0.3, 4, 12), spine1, 0, 0.02, 0).scale.set(1, 1, 0.68);
  const neck = J('Neck', spine1, 0, 0.25, 0);
  M(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), neck, 0, 0.03, 0);
  const head = J('Head', neck, 0, 0.08, 0);
  M(new THREE.SphereGeometry(0.115, 16, 12), head, 0, 0.1, 0);
  const band = M(new THREE.TorusGeometry(0.125, 0.014, 6, 20, Math.PI), head, 0, 0.1, 0, phonesMat);
  band.rotation.y = Math.PI / 2;
  for (const sx of [-1, 1]) M(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 14), head, sx * 0.12, 0.09, 0, phonesMat).rotation.z = Math.PI / 2;
  for (const [side, sx] of [['Left', 1], ['Right', -1]]) { // DJ faces +Z → anatomical left is +X
    const arm = J(side + 'Arm', spine1, sx * 0.22, 0.17, 0);
    M(new THREE.CapsuleGeometry(0.055, 0.2, 3, 8), arm, 0, -0.14, 0);
    const fore = J(side + 'ForeArm', arm, 0, -0.29, 0);
    M(new THREE.CapsuleGeometry(0.045, 0.19, 3, 8), fore, 0, -0.13, 0);
    const hand = J(side + 'Hand', fore, 0, -0.26, 0);
    M(new THREE.SphereGeometry(0.045, 10, 8), hand, 0, -0.03, 0);
  }
  return root;
}

const _right = new THREE.Vector3(), _q = new THREE.Quaternion();
// tracks swapped out during the fist pump: right arm + neck/head (the head looks up at the raised fist)
const PUMP_TRACKS = /(^|[^a-z])(Right(Shoulder|Arm|ForeArm|Hand)|Neck|Head)[^.]*\./i;
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Baked clip locked to the scene beat clock. Optionally replaces the right-arm fist pump (clip beats 11-15)
// with the same arm's motion from 8 beats earlier (jog wheel → mixer taps), so hands stay on the gear.
function clipPlayer(model, gltf, cfg) {
  const clip = (cfg.clipName && THREE.AnimationClip.findByName(gltf.animations, cfg.clipName)) || gltf.animations[0];
  const mixer = new THREE.AnimationMixer(model);
  const bpm = cfg.clipBpm ?? 128, beats = cfg.clipBeats ?? Math.round((clip.duration * bpm) / 60);
  const spb = 60 / bpm, pump = cfg.fistPump ?? 1;
  const rTracks = clip.tracks.filter((t) => PUMP_TRACKS.test(t.name));
  let actions;
  if (pump < 1 && rTracks.length) {
    const body = new THREE.AnimationClip(clip.name + '_body', clip.duration, clip.tracks.filter((t) => !rTracks.includes(t)));
    const rOnly = new THREE.AnimationClip(clip.name + '_rightArm', clip.duration, rTracks);
    actions = { body: mixer.clipAction(body), r: mixer.clipAction(rOnly) };
    actions.rAlt = mixer.clipAction(new THREE.AnimationClip(clip.name + '_rightArmAlt', clip.duration, rTracks.map((t) => t.clone())));
  } else actions = { body: mixer.clipAction(clip) };
  for (const a of Object.values(actions)) { a.play(); a.paused = false; }
  return {
    name: clip.name, beats, rightTracks: rTracks.length, duration: clip.duration,
    update(beat) {
      const b = ((beat % beats) + beats) % beats;
      actions.body.time = b * spb;
      if (actions.r) {
        const replace = (smoothstep(10.6, 11.2, b) * (1 - smoothstep(15.2, 15.8, b))) * (1 - pump);
        actions.r.time = b * spb; actions.rAlt.time = (((b - 8) % beats + beats) % beats) * spb;
        actions.r.setEffectiveWeight(1 - replace); actions.rAlt.setEffectiveWeight(replace);
      }
      mixer.update(0);
    },
  };
}

export async function buildDJ(loader) {
  const cfg = BOOTH.dj;
  const root = new THREE.Group(); root.name = 'dj';
  if (!cfg?.enabled) return { object: root, update() {}, mode: 'disabled' };
  root.rotation.y = cfg.rotY;
  const holder = new THREE.Group(); root.add(holder);
  const [tx, ty, tz] = BOOTH.table.position;
  const tableTop = new THREE.Vector3(tx, ty + BOOTH.table.size[1], tz);

  let model, player = null, mode;
  const gltf = await loadOptionalGLB(loader, cfg.url);
  if (gltf) {
    root.position.fromArray(cfg.position);
    model = gltf.scene;
    const tints = cfg.materialTint ?? {}, hidden = new Set(cfg.hideMeshes ?? []);
    model.traverse((o) => {
      if (!o.isMesh) return;
      if (hidden.has(o.name)) { o.visible = false; return; }
      o.castShadow = true; o.receiveShadow = true;
      o.frustumCulled = false; // skinned mesh leaves its rest bbox while animating
      for (const m of [o.material].flat()) {
        if (!m) continue;
        m.side = THREE.DoubleSide;
        if (tints[m.name] != null) m.color?.setHex(tints[m.name]); // multiplies the baked texture
      }
    });
    if (cfg.scale && cfg.scale !== 1) model.scale.multiplyScalar(cfg.scale);
    if (cfg.height || !cfg.keepOrigin) {
      model.updateMatrixWorld(true);
      let box = new THREE.Box3().setFromObject(model, true);
      if (cfg.height) model.scale.multiplyScalar(cfg.height / box.getSize(new THREE.Vector3()).y);
      if (!cfg.keepOrigin) {
        model.updateMatrixWorld(true);
        box = new THREE.Box3().setFromObject(model, true);
        const c = box.getCenter(new THREE.Vector3());
        model.position.x -= c.x; model.position.z -= c.z; model.position.y -= box.min.y;
      }
    }
    holder.add(model);
    if (gltf.animations.length) { player = clipPlayer(model, gltf, cfg); mode = `clip:${player.name} (${player.beats} beats, ${player.rightTracks} pump-replaceable tracks, ${player.duration.toFixed(3)}s)`; }
  } else {
    root.position.fromArray(cfg.placeholderPosition ?? cfg.position);
    model = placeholder(); holder.add(model);
  }

  // warm key light from the front of the booth so the DJ's face reads
  if (cfg.keyLight) {
    const k = cfg.keyLight;
    const key = new THREE.SpotLight(k.color, k.intensity, 5, k.angle, 0.7, 1.5);
    key.position.fromArray(k.position); key.target.position.fromArray(k.target);
    root.userData.keyLight = key;
  }

  const bones = findBones(model);
  const driver = !player && hasDJBones(bones) ? createDJDriver(root, bones, cfg, tableTop) : null;
  mode ??= driver ? (gltf ? 'glb-procedural' : 'placeholder-procedural') : 'glb-whole-bob';
  const { amount, nod } = cfg.bob;

  function update(beat, dt) {
    if (player) {
      player.update(beat);
      if (cfg.headPitch && bones.Head) { // bias the baked head pose down towards the decks / crowd (nod stays)
        root.updateMatrixWorld(true);
        rotateBoneWorld(bones.Head, _right.set(1, 0, 0).applyQuaternion(root.getWorldQuaternion(_q)), cfg.headPitch);
      }
      return;
    }
    if (driver) { driver(beat); return; }
    const dip = 0.5 - 0.5 * Math.cos(2 * Math.PI * (beat % 1)); // no skeleton: whole model bob + nod
    holder.position.y = -amount * dip; holder.rotation.x = nod * 0.35 * dip;
  }
  update(0, 0);
  return { object: root, update, mode, bones };
}
