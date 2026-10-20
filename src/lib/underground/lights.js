// Show lighting: truss, moving heads with volumetric beams, washes, strobes, laser fan, haze, crowd.
import * as THREE from 'three';
import { LIGHT_TRUSS, CROWD, WAREHOUSE, CAMERA, BACK_LOGO } from './layout.js';
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
  const T = LIGHT_TRUSS, y = T.y;
  const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.4, roughness: 0.5 });
  // No box truss and no moving heads: the brutalist ceiling is the rig. `movers` stays empty so the
  // update loop (which drives heads/beams) simply has nothing to step.
  const movers = [];
  const [z0] = T.z;

  // ── red / amber washes ──
  const washes = T.washes.map((w) => {
    const light = new THREE.SpotLight(w.color, 380, 30, w.angle ?? 0.42, 0.8, 1.5);
    light.position.set(w.pos[0], y - 0.3, w.pos[1]); light.target.position.fromArray(w.target);
    show.add(light, light.target);
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
  const lampY = Math.min(6.2, WAREHOUSE.eaveHeight - 0.5); // under a pitched roof it hangs above the eaves; under a flat ceiling, below it
  lampShade.position.set(-5, lampY, 12); show.add(lampShade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.3, 0.3) }));
  bulb.position.set(-5, lampY - 0.15, 12); show.add(bulb);
  const sodium = new THREE.PointLight(0xff9a3a, 25, 16, 1.6); sodium.position.set(-5, lampY - 0.3, 12); show.add(sodium);
  const cableLen = Math.max(0.4, Math.min(2, WAREHOUSE.eaveHeight + 0.5 - lampY));
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, cableLen), fixtureMat); cable.position.set(-5, lampY + cableLen / 2, 12); show.add(cable);

  // ── strobes (light only: the hanging boxes went with the truss) ──
  const strobeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const strobes = [];
  const strobeLight = new THREE.PointLight(0xdfe8ff, 0, 40, 1.2); strobeLight.position.set(0, y - 0.5, -10); show.add(strobeLight);

  // Laser fan removed. Empty group/list keep the update loop a no-op.
  const laserGroup = new THREE.Group();
  const lasers = [];

  // Logo on the back wall, above the booth, facing the floor.
  const logoMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false });
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(BACK_LOGO.size, BACK_LOGO.size), logoMat);
  logo.name = 'back-logo';
  logo.position.fromArray(BACK_LOGO.position);
  show.add(logo);
  new THREE.TextureLoader().load(BACK_LOGO.url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    logoMat.map = tex;
    logoMat.needsUpdate = true;
  });

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
// Dense near the booth and across the middle of the floor. A pocket stays clear only right
// at the camera, so the old sightline corridor does not open a hole in the crowd.
function crowdSpots(count) {
  const [xa, xb] = CROWD.x, [za, zb] = CROWD.z, [sp0, sp1] = CROWD.spacing;
  const dj = V(0, 2.15, -17.7);
  const cams = [[V(...CAMERA.dancefloor.pos), dj]];
  if (CAMERA.embed) cams.push([V(...CAMERA.embed.center), V(...CAMERA.embed.target)]);
  const pathPts = [];
  const intro = new THREE.CatmullRomCurve3(CAMERA.intro.path.map((p) => V(...p)), false, 'centripetal');
  for (let i = 0; i <= 40; i++) { const p = intro.getPointAt(i / 40); if (p.y < 2.2) pathPts.push(p); }
  const nearLens = (x, z) => cams.some(([c]) => Math.hypot(c.x - x, c.z - z) < 1.05)
    || pathPts.some((p) => Math.hypot(p.x - x, p.z - z) < 0.65);
  const people = [];
  const place = (x, z) => {
    const f = Math.min(1, Math.max(0, (z - za) / (zb - za)));
    const spacing = sp0 + (sp1 - sp0) * f;
    if (x < xa || x > xb || z < za || z > zb) return false;
    if (Math.abs(x) < 1.0 && z < -15.2) return false; // front subs + riser apron
    if (people.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < spacing * spacing)) return false;
    if (nearLens(x, z)) return false;
    const s = 0.92 + rand() * 0.16;
    const ry = Math.atan2(dj.x - x, dj.z - z) + (rand() - 0.5) * 0.7;
    const r = rand(), arms = r < 0.16 ? 'pump' : r < 0.27 ? 'both' : r < 0.45 ? 'fwd' : 'down';
    people.push({ x, z, ry, s, w: 0.9 + rand() * 0.2, ph: rand(), amp: 0.5 + rand(), arms, style: rand() < 0.12 ? 'jump' : rand() < 0.5 ? 'sway' : 'bob', side: rand() < 0.5 ? 1 : -1 });
    return true;
  };
  let tries = 0;
  while (people.length < count && tries++ < 50000) {
    const x = xa + rand() * (xb - xa), f = Math.pow(rand(), 1.25), z = za + f * (zb - za);
    place(x, z);
  }
  // The old camera corridor sat in the middle of the floor. Seed that band until it is full.
  const fillTarget = people.length + Math.round(count * 0.22);
  let fillTries = 0;
  while (people.length < fillTarget && fillTries++ < 16000) {
    const x = (rand() - 0.5) * 7.2;
    const z = -15.8 + rand() * 11.2;
    place(x, z);
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
