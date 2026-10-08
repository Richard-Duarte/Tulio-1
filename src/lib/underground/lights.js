// Show lighting: truss, moving heads with volumetric beams, washes, strobes, laser fan, haze, crowd.
import * as THREE from 'three';
import { LIGHT_TRUSS, LASER, CROWD, WAREHOUSE, CAMERA } from './layout.js';
import { beamsMesh } from './warehouse.js';
import { smokeTexture, radialTexture, rand } from './textures.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ── cheap volumetric beam: additive open cone, soft edges via view-angle falloff ──
const beamVert = /* glsl */`
  varying float vAlong; varying vec3 vN; varying vec3 vV; varying vec3 vW;
  void main(){
    vAlong = 1.0 - uv.y;                       // 0 at the lens, 1 at the far end
    vec4 mv = modelViewMatrix * vec4(position,1.0);
    vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
    vW = (modelMatrix * vec4(position,1.0)).xyz;
    gl_Position = projectionMatrix * mv;
  }`;
const beamFrag = /* glsl */`
  uniform vec3 color; uniform float intensity; uniform float floorY;
  varying float vAlong; varying vec3 vN; varying vec3 vV; varying vec3 vW;
  void main(){
    float edge = pow(abs(dot(vN, vV)), 1.6);
    float fall = pow(1.0 - vAlong, 1.3) * smoothstep(0.0, 0.04, vAlong);
    float below = smoothstep(floorY - 0.05, floorY + 0.4, vW.y);  // fade where it hits the floor
    float a = edge * fall * below * intensity;
    gl_FragColor = vec4(color * a, 1.0);
  }`;
export function makeBeam(length, angle, color, intensity = 1) {
  const r = Math.tan(angle) * length;
  const geo = new THREE.CylinderGeometry(0.06, r, length, 32, 1, true);
  geo.translate(0, -length / 2, 0); geo.rotateX(-Math.PI / 2); // apex at origin, extends along +Z
  const mat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, intensity: { value: intensity }, floorY: { value: 0 } },
    vertexShader: beamVert, fragmentShader: beamFrag,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false;
  return m;
}

export function buildShow(scene, opts) {
  const show = new THREE.Group(); show.name = 'show'; scene.add(show);
  const T = LIGHT_TRUSS, y = T.y, s = T.section;
  const alu = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.9, roughness: 0.35 });
  const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.4, roughness: 0.5 });

  // box truss rectangle
  const beams = [];
  const [x0, x1] = T.x, [z0, z1] = T.z;
  const edges = [[V(x0, y, z0), V(x1, y, z0)], [V(x1, y, z0), V(x1, y, z1)], [V(x1, y, z1), V(x0, y, z1)], [V(x0, y, z1), V(x0, y, z0)]];
  for (const [a, b] of edges) {
    const dir = b.clone().sub(a), len = dir.length(); dir.normalize();
    const side = V(-dir.z, 0, dir.x).multiplyScalar(s / 2), upv = V(0, s / 2, 0);
    const corners = [side.clone().add(upv), side.clone().sub(upv), side.clone().negate().add(upv), side.clone().negate().sub(upv)];
    for (const c of corners) beams.push([a.clone().add(c), b.clone().add(c), 0.04]);
    const n = Math.round(len / s);
    for (let i = 0; i < n; i++) {
      const p0 = a.clone().addScaledVector(dir, (i / n) * len), p1 = a.clone().addScaledVector(dir, ((i + 1) / n) * len);
      for (let k = 0; k < 4; k++) beams.push([p0.clone().add(corners[k]), p1.clone().add(corners[(k + 1) % 4]), 0.018]);
    }
  }
  // chain hoists up to the roof trusses
  for (const x of [x0, x1]) for (const z of [z0, z1]) beams.push([V(x, y + s / 2, z), V(x, WAREHOUSE.eaveHeight, z), 0.02]);
  show.add(beamsMesh(beams, alu));

  // ── moving heads ──
  const movers = T.movers.slice(0, opts.maxMovers ?? T.movers.length).map(([x, z], i) => {
    const pos = V(x, y - s / 2 - 0.35, z);
    const body = new THREE.Group(); body.position.copy(pos);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.3), fixtureMat); base.position.y = 0.28; body.add(base);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.34, 16), fixtureMat); body.add(head);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.11, 20), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    show.add(body);
    const light = new THREE.SpotLight(0xffffff, 900, 32, 0.13, 0.5, 1.6);
    light.position.copy(pos); show.add(light); show.add(light.target);
    const beam = makeBeam(15, 0.13, 0xffffff, 0.5); beam.position.copy(pos); show.add(beam);
    lens.position.copy(pos); show.add(lens);
    return { pos, light, beam, head, lens, i };
  });

  // ── red / amber washes ──
  const washes = T.washes.map((w) => {
    const light = new THREE.SpotLight(w.color, 380, 30, w.angle ?? 0.42, 0.8, 1.5);
    light.position.set(w.pos[0], y - 0.3, w.pos[1]); light.target.position.fromArray(w.target);
    show.add(light, light.target);
    const par = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 12), fixtureMat);
    par.position.copy(light.position); show.add(par);
    return { light, base: 380 };
  });
  // uplights behind the booth, washing the back wall red
  const up = [-4, 4].map((x) => {
    const l = new THREE.SpotLight(0xff1000, 250, 14, 0.6, 1, 1.5);
    l.position.set(x, 0.2, -19.3); l.target.position.set(x * 0.6, 7, -20); show.add(l, l.target);
    return l;
  });
  // one shadow-casting key from the front truss, gives the stacks/booth proper grounding
  const key = new THREE.SpotLight(0xff5020, 45, 30, 0.55, 0.9, 1.5);
  key.position.set(0, y - 0.3, z0 + 1.5); key.target.position.set(0, 0.8, -17.5);
  key.castShadow = !!opts.shadows; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005; key.shadow.camera.near = 2; key.shadow.camera.far = 20;
  show.add(key, key.target);

  // moonlight through the skylights + faint light shafts
  const moon = new THREE.DirectionalLight(0x6f8fd0, 0.45); moon.position.set(-6, 20, 4); show.add(moon);
  const shafts = [];
  for (const b of WAREHOUSE.skylightBays) {
    const bayLen = WAREHOUSE.length / WAREHOUSE.bays, z = -WAREHOUSE.length / 2 + bayLen * (b + 0.5);
    for (const sx of [-1, 1]) {
      const shaft = makeBeam(11, 0.12, 0x5a78b0, 0.2);
      shaft.position.set(sx * 6.6, 9.3, z); shaft.lookAt(sx * 5.2, 0, z + 1.5);
      shaft.scale.set(1.6, 1.0, 1); show.add(shaft); shafts.push(shaft);
    }
  }

  // hazard: hazy sodium lamp far at the back
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.3, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide }));
  lampShade.position.set(-5, 6.2, 12); show.add(lampShade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.3, 0.3) }));
  bulb.position.set(-5, 6.05, 12); show.add(bulb);
  const sodium = new THREE.PointLight(0xff9a3a, 25, 16, 1.6); sodium.position.set(-5, 5.9, 12); show.add(sodium);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2), fixtureMat); cable.position.set(-5, 7.3, 12); show.add(cable);

  // ── strobes ──
  const strobeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const strobes = T.strobes.map(([x, z]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.12), strobeMat); m.position.set(x, y - s / 2 - 0.12, z); show.add(m); return m;
  });
  const strobeLight = new THREE.PointLight(0xdfe8ff, 0, 40, 1.2); strobeLight.position.set(0, y - 0.5, -10); show.add(strobeLight);

  // ── laser fan ──
  const laserGroup = new THREE.Group(); laserGroup.position.fromArray(LASER.origin); show.add(laserGroup);
  const laserTex = radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 64);
  const laserMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(LASER.color).multiplyScalar(1.6), alphaMap: laserTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const laserGeo = new THREE.PlaneGeometry(0.022, LASER.length); laserGeo.translate(0, LASER.length / 2, 0); laserGeo.rotateX(Math.PI / 2);
  // stretch alphaMap across width only: rewrite uvs so v is constant
  const luv = laserGeo.attributes.uv; for (let i = 0; i < luv.count; i++) luv.setY(i, 0.5);
  const lasers = [];
  for (let i = 0; i < LASER.beams; i++) {
    const g = new THREE.Group();
    const a = new THREE.Mesh(laserGeo, laserMat), b = new THREE.Mesh(laserGeo, laserMat); b.rotation.z = Math.PI / 2;
    g.add(a, b); laserGroup.add(g); lasers.push(g);
  }
  const laserBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.3), fixtureMat); laserBox.position.fromArray(LASER.origin); show.add(laserBox);

  // ── haze sprites ──
  const smoke = smokeTexture();
  const haze = [];
  const hazeMat = new THREE.SpriteMaterial({ map: smoke, color: 0x6a5a7a, transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
  for (let i = 0; i < (opts.hazeCount ?? 70); i++) {
    const sp = new THREE.Sprite(hazeMat);
    sp.position.set((rand() - 0.5) * 18, 1 + rand() * 6, -18 + rand() * 26);
    const sc = 4 + rand() * 6; sp.scale.set(sc, sc, 1);
    sp.userData.v = V((rand() - 0.5) * 0.15, (rand() - 0.5) * 0.03, (rand() - 0.5) * 0.15);
    show.add(sp); haze.push(sp);
  }

  // ── crowd silhouettes ──
  let crowd = null;
  if (CROWD.enabled) crowd = buildCrowd(show, opts.crowdCount ?? CROWD.count);

  return { movers, washes, up, key, strobes, strobeMat, strobeLight, lasers, laserGroup, haze, hazeMat, shafts, sodium, crowd };
}

// humanoid silhouette parts (shared by the crowd and the DJ placeholder)
export function humanParts(armsUp, withHead = true) {
    const parts = [];
    const body = new THREE.CapsuleGeometry(0.19, 0.55, 4, 10); body.scale(1, 1, 0.7); body.translate(0, 1.12, 0); parts.push(body);
    for (const sx of [-1, 1]) {
      const leg = new THREE.CapsuleGeometry(0.075, 0.7, 3, 6); leg.translate(sx * 0.1, 0.43, 0); parts.push(leg);
      const arm = new THREE.CapsuleGeometry(0.05, 0.55, 3, 6);
      if (armsUp) { arm.rotateZ(sx * -0.35); arm.translate(sx * 0.3, 1.72, 0); }
      else { arm.rotateZ(sx * 0.2); arm.translate(sx * 0.26, 1.1, 0.03); }
      parts.push(arm);
    }
    if (withHead) { const head = new THREE.SphereGeometry(0.115, 12, 10); head.translate(0, 1.63, 0); parts.push(head); }
    return mergeGeometries(parts);
}

// Dancers: instanced bodies + separately instanced arms (so arms can pump / wave per person).
// Dense near the booth, thinning towards the back; kept out of camera positions, the intro path,
// the embed orbit path and the sightlines of the low cameras to the DJ.
function crowdSpots(count) {
  const [xa, xb] = CROWD.x, [za, zb] = CROWD.z, [sp0, sp1] = CROWD.spacing;
  const dj = V(0, 2.15, -17.7);
  // low cameras: [pos, target]; sightline to the DJ (or the shot target) must stay mostly free
  const cams = Object.values(CAMERA.shots).filter((c) => c.pos[1] < 2.6).map((c) => [V(...c.pos), c.target ? V(...c.target) : dj]);
  cams.push([V(...CAMERA.dancefloor.pos), dj]);
  const nShot = cams.length;                       // hand-placed shot cameras get a wider clear zone than the embed orbit samples
  const pathPts = [];
  const intro = new THREE.CatmullRomCurve3(CAMERA.intro.path.map((p) => V(...p)), false, 'centripetal');
  for (let i = 0; i <= 80; i++) { const p = intro.getPointAt(i / 80); if (p.y < 2.8) pathPts.push(p); }
  if (CAMERA.embed) for (let i = 0; i < 48; i++) { const p = embedCameraPos(CAMERA.embed, i * 9.7); pathPts.push(p); cams.push([p, V(...CAMERA.embed.target)]); }
  const blocks = (x, z, top) => cams.some(([c, t]) => {
    const dx = t.x - c.x, dz = t.z - c.z, L2 = dx * dx + dz * dz;
    const u = ((x - c.x) * dx + (z - c.z) * dz) / L2;
    if (u < 0 || u > 1) return false;
    const d = Math.hypot(c.x + dx * u - x, c.z + dz * u - z);
    if (d > 0.42) return false;
    const h = c.y + (t.y - c.y) * u;          // sightline height above this dancer
    return top > h - 0.12;
  });
  const people = [];
  let tries = 0;
  while (people.length < count && tries++ < 40000) {
    const x = xa + rand() * (xb - xa), f = Math.pow(rand(), 1.7), z = za + f * (zb - za);
    const spacing = sp0 + (sp1 - sp0) * f;
    if (Math.abs(x) < 1.0 && z < -15.2) continue;                                  // front subs + riser apron
    if (people.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < spacing * spacing)) continue;
    if (cams.some(([c, t], ci) => {                                                     // not inside / right in front of a camera
      const d = Math.hypot(c.x - x, c.z - z); if (d < 1.1) return true;
      const fx = t.x - c.x, fz = t.z - c.z, cos = ((x - c.x) * fx + (z - c.z) * fz) / (d * Math.hypot(fx, fz));
      return ci < nShot ? d < 3.3 && cos > 0.72 : d < 2.4 && cos > 0.8;
    })) continue;
    if (pathPts.some((p) => Math.hypot(p.x - x, p.z - z) < 0.9)) continue;         // intro fly-through / embed orbit
    const s = 0.92 + rand() * 0.16;
    const r = rand(), arms = r < 0.16 ? 'pump' : r < 0.27 ? 'both' : r < 0.45 ? 'fwd' : 'down';
    const top = (arms === 'down' || arms === 'fwd' ? 1.75 : 2.2) * s;
    if (blocks(x, z, top)) continue;
    const ry = Math.atan2(dj.x - x, dj.z - z) + (rand() - 0.5) * 0.7;
    people.push({ x, z, ry, s, w: 0.9 + rand() * 0.2, ph: rand(), amp: 0.5 + rand(), arms, style: rand() < 0.12 ? 'jump' : rand() < 0.5 ? 'sway' : 'bob', side: rand() < 0.5 ? 1 : -1 });
  }
  return people;
}
export function embedCameraPos(e, t, out = V()) {
  return out.set(e.center[0] + e.radius[0] * Math.sin(t * e.speed[0]), e.center[1] + e.bob * Math.sin(t * e.speed[2]), e.center[2] + e.radius[1] * Math.cos(t * e.speed[1]));
}

function buildCrowd(parent, count) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  const people = crowdSpots(count);
  const parts = [];
  const torso = new THREE.CapsuleGeometry(0.19, 0.55, 3, 8); torso.scale(1, 1, 0.7); torso.translate(0, 1.12, 0); parts.push(torso);
  for (const sx of [-1, 1]) { const leg = new THREE.CapsuleGeometry(0.075, 0.7, 2, 6); leg.translate(sx * 0.1, 0.43, 0); parts.push(leg); }
  const head = new THREE.SphereGeometry(0.115, 10, 8); head.translate(0, 1.63, 0); parts.push(head);
  const bodyGeo = mergeGeometries(parts);
  const armGeo = new THREE.CapsuleGeometry(0.048, 0.52, 2, 6); armGeo.translate(0, -0.3, 0); // pivot = shoulder
  const n = people.length;
  const body = new THREE.InstancedMesh(bodyGeo, mat, n), armL = new THREE.InstancedMesh(armGeo, mat, n), armR = new THREE.InstancedMesh(armGeo, mat, n);
  const palette = [0x0c0c0e, 0x131316, 0x17130f, 0x0f1016, 0x1a1a1d, 0x101010];
  const col = new THREE.Color();
  people.forEach((p, i) => { col.setHex(palette[i % palette.length]); for (const m of [body, armL, armR]) m.setColorAt(i, col); });
  for (const m of [body, armL, armR]) { m.frustumCulled = false; parent.add(m); }
  const blobMat = new THREE.MeshBasicMaterial({ color: 0, alphaMap: radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true, opacity: 0.2, depthWrite: false });
  const blobGeo = new THREE.PlaneGeometry(0.9, 0.9); blobGeo.rotateX(-Math.PI / 2);
  const blobs = new THREE.InstancedMesh(blobGeo, blobMat, n);
  const mtx = new THREE.Matrix4(), local = new THREE.Matrix4(), rot = new THREE.Matrix4();
  people.forEach((p, i) => { mtx.makeTranslation(p.x, 0.005, p.z); blobs.setMatrixAt(i, mtx); });
  parent.add(blobs);
  const q = new THREE.Quaternion(), e = new THREE.Euler(), ea = new THREE.Euler(0, 0, 0, 'ZXY'), pos = V(), sc = V(), sh = V();
  function armPose(p, left, beat, kick) {
    const out = left ? -1 : 1, t = beat + p.ph * 2;
    let x = 0, z = 0.12;
    const pumpSide = p.side > 0 ? !left : left;
    switch (p.arms) {
      case 'pump': if (pumpSide) { x = -2.55 - 0.35 * kick * p.amp; z = 0.25; } else { x = -0.2 + 0.15 * Math.sin(t * Math.PI); } break;
      case 'both': x = -2.6 + 0.15 * Math.sin(t * Math.PI * 0.5); z = 0.35 + 0.2 * Math.sin(t * Math.PI + (left ? 0 : 1.5)); break;
      case 'fwd': x = -0.75 - 0.35 * Math.sin((t + (left ? 0 : 0.5)) * Math.PI * 2) * 0.6 - 0.2 * kick; z = 0.2; break;
      default: x = 0.25 * Math.sin((t + (left ? 0 : 1)) * Math.PI) * p.amp; z = 0.1 + 0.05 * kick;
    }
    ea.set(x, 0, z * out); return ea;
  }
  function update(beat) {
    const bf = beat % 1, kick = Math.exp(-bf * 7);
    for (let i = 0; i < n; i++) {
      const p = people[i];
      const ph = (beat + p.ph * 0.25) % 1;
      let y = -Math.abs(Math.sin(ph * Math.PI)) * 0.045 * p.amp, roll = Math.sin((beat * 0.5 + p.ph) * Math.PI) * 0.03;
      if (p.style === 'jump') y = Math.max(0, Math.sin(ph * Math.PI * 2)) * 0.09 * p.amp;
      else if (p.style === 'sway') roll *= 2.5;
      e.set(0, p.ry + Math.sin((beat + p.ph * 4) * Math.PI * 0.5) * 0.12 * p.amp, roll);
      q.setFromEuler(e); pos.set(p.x, y, p.z); sc.set(p.s * p.w, p.s, p.s * p.w);
      mtx.compose(pos, q, sc); body.setMatrixAt(i, mtx);
      for (const [m, left] of [[armL, true], [armR, false]]) {
        rot.makeRotationFromEuler(armPose(p, left, beat, kick));
        local.makeTranslation(sh.set(left ? -0.245 : 0.245, 1.41, 0)).multiply(rot);
        m.setMatrixAt(i, local.premultiply(mtx));
      }
    }
    body.instanceMatrix.needsUpdate = armL.instanceMatrix.needsUpdate = armR.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { update, count: n };
}
