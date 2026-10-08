// Procedural club-DJ animation for a mixamo-style skeleton (or any Object3D hierarchy using the same names).
// Convention-agnostic: every rotation is applied in world space and arms use a 2-bone IK solver,
// so it works regardless of the rig's bone axes / rest pose (T-pose, A-pose, ...).
import * as THREE from 'three';

const KEYS = ['Hips', 'Spine', 'Spine1', 'Neck', 'Head', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand'];
const clean = (n) => n.replace(/^.*[:|]/, '').replace(/^mixamorig\d*_?/i, '').toLowerCase();

export function findBones(root) {
  const map = {};
  root.traverse((o) => {
    const n = clean(o.name || '');
    for (const k of KEYS) if (!map[k] && n === k.toLowerCase()) map[k] = o;
  });
  return map;
}
export const hasDJBones = (b) => !!(b.Hips && b.LeftArm && b.LeftForeArm && b.LeftHand && b.RightArm && b.RightForeArm && b.RightHand);

const V = () => new THREE.Vector3(), Q = () => new THREE.Quaternion();
const smooth = (x) => x * x * (3 - 2 * x);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

function rotateWorld(bone, q) {
  const wq = bone.getWorldQuaternion(Q());
  const pq = bone.parent.getWorldQuaternion(Q()).invert();
  bone.quaternion.copy(pq.multiply(q.clone().multiply(wq)));
  bone.updateMatrixWorld(true);
}
const rotAxis = (bone, axis, angle) => bone && rotateWorld(bone, Q().setFromAxisAngle(axis, angle));
export const rotateBoneWorld = rotAxis;
function aim(bone, childWorld, desiredWorld) {
  const p = bone.getWorldPosition(V());
  const cur = childWorld.clone().sub(p).normalize(), des = desiredWorld.clone().sub(p).normalize();
  rotateWorld(bone, Q().setFromUnitVectors(cur, des));
}
function twoBoneIK(upper, lower, end, target, pole) {
  const S = upper.getWorldPosition(V()), E0 = lower.getWorldPosition(V()), H0 = end.getWorldPosition(V());
  const a = S.distanceTo(E0), b = E0.distanceTo(H0);
  const dir = target.clone().sub(S); const d = THREE.MathUtils.clamp(dir.length(), 0.01, (a + b) * 0.999); dir.normalize();
  const T = S.clone().addScaledVector(dir, d);
  const along = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - along * along));
  const pp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
  const E = S.clone().addScaledVector(dir, along).addScaledVector(pp, h);
  aim(upper, E0, E);
  aim(lower, end.getWorldPosition(V()), T);
}

/**
 * @param root   object placed in the world (DJ group); +Z = facing the crowd
 * @param bones  result of findBones()
 * @param cfg    BOOTH.dj config; tableTop = world position of the table centre top
 */
export function createDJDriver(root, bones, cfg, tableTop) {
  const rest = new Map();
  for (const b of Object.values(bones)) rest.set(b, { q: b.quaternion.clone(), p: b.position.clone() });
  const { amount, nod, sway, lean } = cfg.bob;
  const ht = cfg.handTargets, pumpEvery = cfg.fistPumpEvery;
  const right = V(), up = new THREE.Vector3(0, 1, 0), fwd = V(), rq = Q();
  const arms = [['LeftArm', 'LeftForeArm', 'LeftHand'], ['RightArm', 'RightForeArm', 'RightHand']].map((k) => k.map((n) => bones[n]));

  return function update(beat) {
    for (const [b, r] of rest) { b.quaternion.copy(r.q); b.position.copy(r.p); }
    root.updateMatrixWorld(true);
    root.getWorldQuaternion(rq);
    right.set(1, 0, 0).applyQuaternion(rq); fwd.set(0, 0, 1).applyQuaternion(rq);
    const bf = beat % 1, dip = 0.5 - 0.5 * Math.cos(2 * Math.PI * bf);
    const swing = Math.sin(beat * Math.PI * 0.5); // 2-beat side to side

    // hips: knees give on every beat + side sway
    const hips = bones.Hips;
    const hp = hips.getWorldPosition(V()).addScaledVector(up, -amount * dip).addScaledVector(right, swing * sway * 0.4);
    hips.position.copy(hips.parent.worldToLocal(hp)); hips.updateMatrixWorld(true);
    rotAxis(hips, fwd, swing * sway * 0.6);
    rotAxis(hips, up, Math.sin(beat * Math.PI * 0.25) * 0.08);
    // spine: lean over the decks + bounce
    rotAxis(bones.Spine, right, lean * 0.5 + dip * 0.04);
    rotAxis(bones.Spine1, right, lean * 0.4 + dip * 0.03);
    rotAxis(bones.Spine1, fwd, -swing * sway * 0.5);
    // head nod on the beat
    rotAxis(bones.Neck, right, nod * 0.4 * dip);
    rotAxis(bones.Head, right, nod * dip + 0.05);
    rotAxis(bones.Head, fwd, Math.sin(beat * Math.PI * 0.125) * 0.06);

    // hands: alternate CDJ ↔ mixer every 2 beats, jog-wheel circles, fist pump every N beats
    const cycle = (beat % 4) / 2;                     // 0..2
    const swap = smooth(clamp01((cycle % 1) * 4)) ; // quick move at start of each 2-beat block
    const phaseA = Math.floor(cycle) === 0;
    const pumpPhase = beat % pumpEvery, pumpW = pumpPhase > pumpEvery - 4 ? smooth(clamp01((pumpPhase - (pumpEvery - 4)) * 2)) * smooth(clamp01((pumpEvery - pumpPhase) * 2)) : 0;
    for (const [upper, lower, end] of arms) {
      const s = Math.sign(upper.getWorldPosition(V()).sub(tableTop).dot(right)) || 1; // which side of the table this arm is on
      const onMixerNow = (s > 0) === phaseA, onMixerPrev = !onMixerNow;
      const xNow = onMixerNow ? ht.mixerX : ht.cdjX, xPrev = onMixerPrev ? ht.mixerX : ht.cdjX;
      const x = THREE.MathUtils.lerp(xPrev, xNow, swap);
      const lift = Math.sin(swap * Math.PI) * 0.06;    // hand lifts while moving
      const jog = onMixerNow ? 0.012 : 0.03, ang = beat * Math.PI * 2 * (onMixerNow ? 1 : 0.5);
      const T = tableTop.clone().addScaledVector(right, s * x + Math.cos(ang) * jog)
        .addScaledVector(up, ht.y + lift - 0.015 * dip).addScaledVector(fwd, ht.z + Math.sin(ang) * jog);
      const pole = V().addScaledVector(right, s * 0.8).addScaledVector(fwd, -0.3).addScaledVector(up, -0.5);
      if (s < 0 && pumpW > 0) { // fist pump with the hand on the -X side
        const sh = upper.getWorldPosition(V());
        const P = sh.addScaledVector(up, 0.5 + 0.1 * Math.abs(Math.sin(beat * Math.PI))).addScaledVector(fwd, 0.2).addScaledVector(right, s * 0.12);
        T.lerp(P, pumpW); pole.lerp(V().addScaledVector(right, s).addScaledVector(fwd, 0.3), pumpW);
      }
      twoBoneIK(upper, lower, end, T, pole);
    }
  };
}
