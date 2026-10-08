// Scene factory shared by the full-page app (main.js), the ?embed=1 background mode and the mount() API (embed.js).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { MODELS, CAMERA, MUSIC, WAREHOUSE, CROWD } from './layout.js';
import { buildProceduralWarehouse, loadWarehouseGLB } from './warehouse.js';
import { loadModel, buildRig } from './rig.js';
import { buildShow, embedCameraPos } from './lights.js';
import { buildDJ } from './dj.js';
import { buildLineArrays } from './lineArray.js';
import { buildMonitors } from './monitors.js';
import { setModelsBase } from './assets.js';

export const CREDITS = [
  '“Pioneer CDJ 3000 / DJM A9” by MaxTht (sketchfab.com/thetiot.maxime) — CC BY 4.0',
  '“Cerwin Vega Speaker” by sonidero (sketchfab.com/londoncar12345) — Sketchfab Standard',
  'DJ: MakeHuman / MPFB base mesh, rig & clothes (makehumancommunity.org) — CC0',
];

// ── quality presets ──
export const QUALITY = {
  high: { maxDpr: 1.5, samples: 4, bloom: 'full', shadows: true, maxMovers: 6, crowd: CROWD.count, haze: 70 },
  low: { maxDpr: 1, samples: 0, bloom: 'half', shadows: false, maxMovers: 4, crowd: CROWD.lowCount, haze: 35 },
};
export function detectQuality() {
  if (typeof window === 'undefined') return 'high';
  const mm = (q) => window.matchMedia?.(q).matches;
  const coarse = mm('(pointer: coarse)');
  const small = Math.min(window.screen?.width ?? 1e4, window.screen?.height ?? 1e4) < 700 || Math.min(innerWidth, innerHeight) < 500;
  const cores = navigator.hardwareConcurrency || 8, mem = navigator.deviceMemory;
  return coarse || small || cores <= 4 || (mem && mem <= 4) ? 'low' : 'high';
}

const palettes = [
  [0x00e5ff, 0xff00c8], [0xffffff, 0x3a4bff], [0xff0040, 0xffffff], [0x00ff9c, 0x2233ff], [0xff3300, 0xffaa00], [0xb000ff, 0x00e5ff],
];

/**
 * @param target  HTMLElement (a canvas is created inside and fills it) or an existing HTMLCanvasElement
 * @param o       { mode: 'app'|'embed', quality: 'auto'|'high'|'low', orbit, modelsBaseUrl, shot, cam, frozenT,
 *                  strobe, shadows, intro, debug, still, creditsEl, loadingEl, onReady, signal }
 */
export async function createScene(target, o = {}) {
  const embed = o.mode === 'embed';
  const qName = !o.quality || o.quality === 'auto' ? detectQuality() : o.quality;
  const Q = QUALITY[qName] ?? QUALITY.high;
  const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const orbit = embed && o.orbit !== false && !reducedMotion;
  const shadows = Q.shadows && o.shadows !== false;
  if (o.modelsBaseUrl) setModelsBase(o.modelsBaseUrl);

  const ownCanvas = !(target instanceof HTMLCanvasElement);
  const canvas = ownCanvas ? document.createElement('canvas') : target;
  const host = ownCanvas ? target : canvas.parentElement ?? document.body;
  if (ownCanvas) { canvas.style.cssText = 'display:block;width:100%;height:100%;'; host.appendChild(canvas); }
  const size = () => {
    const w = (ownCanvas ? host.clientWidth : canvas.clientWidth) || innerWidth, h = (ownCanvas ? host.clientHeight : canvas.clientHeight) || innerHeight;
    return [Math.max(1, w), Math.max(1, h)];
  };
  let [W, H] = size();

  // ── renderer ──
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, Q.maxDpr));
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020203);
  scene.fog = new THREE.FogExp2(0x050408, WAREHOUSE.glb?.fogDensity ?? 0.03);
  const hemi = new THREE.HemisphereLight(0x2a2a40, 0x0a0806, WAREHOUSE.glb?.hemi ?? 0.15); scene.add(hemi);
  if (o.debug) { hemi.color.set(0xffffff); hemi.groundColor.set(0x888888); hemi.intensity = 2.5; scene.fog.density = 0.002; }

  const camera = new THREE.PerspectiveCamera(embed ? CAMERA.embed.fov : CAMERA.fov, W / H, 0.05, 200);
  // Mouse / touch camera control. Normal mode: always (enabled after the intro). Embed: on unless controls:false.
  const controls = !embed || o.controls !== false ? new OrbitControls(camera, canvas) : null;
  if (controls) {
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.6; controls.zoomSpeed = 0.8; controls.panSpeed = 0.8;
    controls.maxPolarAngle = Math.PI * 0.53;
    controls.minDistance = embed ? 1.5 : 0.8; controls.maxDistance = embed ? 16 : 30;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    controls.cursorStyle = 'grab'; canvas.style.cursor = 'grab';
    controls.enabled = embed;
  }
  // keep camera + orbit target inside the warehouse and above the floor
  const WX = WAREHOUSE.width / 2 - 0.6, WZ = WAREHOUSE.length / 2 - 0.6;
  const camBox = new THREE.Box3(new THREE.Vector3(-WX, 0.35, -WZ), new THREE.Vector3(WX, WAREHOUSE.eaveHeight - 0.4, WZ));
  const tgtBox = new THREE.Box3(new THREE.Vector3(-WX + 1, 0.2, -WZ + 0.5), new THREE.Vector3(WX - 1, 5, WZ - 1));
  const clampCam = () => { camera.position.clamp(camBox.min, camBox.max); controls.target.clamp(tgtBox.min, tgtBox.max); };

  // ── post ──
  const pr = renderer.getPixelRatio();
  const rt = new THREE.WebGLRenderTarget(W * pr, H * pr, { type: THREE.HalfFloatType, samples: Q.samples });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(pr); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.85, 0.55, 0.62);
  if (Q.bloom === 'half') { const set = bloom.setSize.bind(bloom); bloom.setSize = (w, h) => set(Math.ceil(w / 2), Math.ceil(h / 2)); bloom.setSize(W * pr, H * pr); }
  if (Q.bloom !== 'off') composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grain = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){ vec4 c = texture2D(tDiffuse, vUv);
        c.rgb += (h(vUv * 917.0 + fract(time)) - 0.5) * 0.035;
        float d = distance(vUv, vec2(0.5)); c.rgb *= mix(1.0, smoothstep(0.95, 0.25, d), 0.65);
        gl_FragColor = c; }`,
  });
  composer.addPass(grain);

  // ── state / teardown bookkeeping ──
  let disposed = false, raf = 0, running = false, visible = true, onScreen = true;
  const cleanups = [];
  const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); cleanups.push(() => el.removeEventListener(ev, fn, opt)); };
  function dispose() {
    if (disposed) return; disposed = true;
    cancelAnimationFrame(raf); running = false;
    for (const c of cleanups.splice(0)) c();
    controls?.dispose();
    const mats = new Set(), texs = new Set();
    scene.traverse((obj) => {
      obj.geometry?.dispose();
      for (const m of [obj.material].flat()) if (m) mats.add(m);
      if (obj.isInstancedMesh || obj.isLight) obj.dispose?.();
      if (obj.isSkinnedMesh) obj.skeleton?.dispose();
    });
    for (const m of mats) {
      for (const v of Object.values(m)) if (v?.isTexture) texs.add(v);
      for (const u of Object.values(m.uniforms ?? {})) if (u?.value?.isTexture) texs.add(u.value);
      m.dispose();
    }
    for (const t of texs) t.dispose();
    for (const p of composer.passes) p.dispose?.();
    composer.dispose(); rt.dispose();
    renderer.dispose(); renderer.forceContextLoss();
    if (ownCanvas) canvas.remove();
    scene.clear();
  }
  const api = { dispose, scene, camera, renderer, composer, get controls() { return controls; }, get cameraMode() { return embed ? camMode : inIntro ? 'intro' : 'user'; }, quality: qName, credits: CREDITS, get disposed() { return disposed; } };
  o.signal?.addEventListener('abort', dispose);

  // ── load everything ──
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const safe = (p, name) => p.catch((e) => { console.error('failed to load', name, e); return null; });
  const [whGLB, top, sub, djSetup, dj] = await Promise.all([
    loadWarehouseGLB(loader),
    MODELS.top ? safe(loadModel(loader, MODELS.top), 'top') : null,
    MODELS.sub ? safe(loadModel(loader, MODELS.sub), 'sub') : null,
    safe(loadModel(loader, MODELS.djSetup), 'djSetup'),
    buildDJ(loader),
  ]);
  if (disposed) { dispose(); return api; }
  const credits = [...CREDITS];
  const skyLights = [];
  if (whGLB) {
    scene.add(whGLB); credits.unshift(WAREHOUSE.glb.credit);
    // light actually falling from the skylight slots onto the floor (same colour as the panel)
    for (const [x, z] of WAREHOUSE.glb.skylight?.lights ?? []) {
      const l = new THREE.PointLight(0xffffff, WAREHOUSE.glb.skylight.lightIntensity ?? 60, 32, 1.6);
      l.position.set(x, WAREHOUSE.eaveHeight - 0.15, z); scene.add(l); skyLights.push(l);
    }
  } else scene.add(buildProceduralWarehouse());
  api.credits = credits;
  if (o.creditsEl) o.creditsEl.innerHTML = credits.join('<br>');
  const rig = buildRig({ top, sub, djSetup }); scene.add(rig);
  scene.add(buildLineArrays()); // flown line-array hangs above the outer subs (procedural)
  scene.add(buildMonitors());   // DJ monitor stacks on the riser (procedural)
  const rigMixers = rig.userData.mixers ?? [];
  if (!shadows) scene.traverse((m) => { if (m.isMesh) m.castShadow = false; });
  const show = buildShow(scene, { strobe: o.strobe !== false, shadows, maxMovers: Q.maxMovers, crowdCount: Q.crowd, hazeCount: Q.haze });
  if (whGLB) { // the venue model brings its own ceiling: no roof skylight shafts, lighter haze
    for (const s of show.shafts) s.visible = false;
    if (WAREHOUSE.glb.hazeOpacity != null) show.hazeMat.opacity = WAREHOUSE.glb.hazeOpacity;
  }
  scene.add(dj.object);
  if (dj.object.userData.keyLight) { const k = dj.object.userData.keyLight; scene.add(k, k.target); }
  api.djMode = dj.mode; api.crowdCount = show.crowd?.count ?? 0;
  api.sizes = { top: top?.userData.size, sub: sub?.userData.size, dj: djSetup?.userData.size };

  // ── camera ──
  const v3 = (a) => new THREE.Vector3(...a);
  const embedTarget = v3(CAMERA.embed.target);
  const introPath = new THREE.CatmullRomCurve3(CAMERA.intro.path.map(v3), false, 'centripetal');
  const introLook = new THREE.CatmullRomCurve3(CAMERA.intro.look.map(v3), false, 'centripetal');
  let introT = 0, inIntro = !embed && !o.shot && !o.cam && o.intro !== false;
  function endIntro() {
    if (!inIntro && controls.enabled) return;
    inIntro = false;
    const d = CAMERA.dancefloor;
    if (!o.shot) { camera.position.fromArray(d.pos); controls.target.fromArray(d.target); }
    controls.enabled = true; controls.update();
  }
  function setShot(name) {
    const s = CAMERA.shots[name] ?? CAMERA.dancefloor;
    camera.fov = s.fov ?? CAMERA.fov; camera.updateProjectionMatrix();
    camera.position.fromArray(s.pos); controls.target.fromArray(s.target); controls.enabled = true; controls.update();
  }
  api.setShot = setShot;
  if (embed) { embedCameraPos(CAMERA.embed, 0, camera.position); camera.lookAt(embedTarget); }
  else if (o.cam) { const [a, b, c, d, e, f] = o.cam; CAMERA.shots.custom = { pos: [a, b, c], target: [d, e, f] }; setShot('custom'); }
  else if (o.shot) setShot(o.shot); else if (!inIntro) endIntro();
  // capture phase: runs before OrbitControls' own pointerdown, so the same click-drag that skips the intro already rotates
  if (!embed) { const skip = () => inIntro && endIntro(); on(window, 'pointerdown', skip, true); on(window, 'keydown', skip); }

  // embed: auto-orbit until the user interacts; resume ~8 s after the last interaction, easing from where the user left it
  let camMode = 'auto', lastInput = 0, zoomArmed = false; const blend = { t: 0, dur: 3.5, pos: new THREE.Vector3(), tgt: new THREE.Vector3() };
  const IDLE = (o.resumeAfter ?? 8) * 1000;
  if (embed && controls) {
    controls.target.copy(embedTarget);
    controls.enableZoom = false;   // wheel zoom only after clicking/touching the canvas, or with ctrl/cmd held → never hijacks page scroll
    on(canvas, 'pointerdown', () => { zoomArmed = true; controls.enableZoom = true; }, true);
    on(canvas, 'pointerleave', (e) => { if (e.pointerType === 'mouse') { zoomArmed = false; controls.enableZoom = false; } });
    on(window, 'wheel', (e) => { if (e.target === canvas) controls.enableZoom = zoomArmed || e.ctrlKey || e.metaKey; }, { capture: true, passive: true });
    controls.addEventListener('start', () => { camMode = 'user'; lastInput = performance.now(); });
    controls.addEventListener('end', () => { lastInput = performance.now(); });   // idle timer runs from the last release (not 'change': damping keeps firing it)
  }
  function resumeOrbit() {
    // pick the point on the orbit path nearest to the current camera, so the ease back is short
    let best = camT, bd = Infinity; const p = tmpDir;
    for (let k = 0; k < 280; k++) { const t = camT + k * 0.5; embedCameraPos(CAMERA.embed, t, p); const d = p.distanceToSquared(camera.position); if (d < bd) { bd = d; best = t; } }
    camT = best; blend.t = 0; blend.pos.copy(camera.position); blend.tgt.copy(controls.target); camMode = 'blend';
    zoomArmed = false; controls.enableZoom = false;
  }

  // ── resize / visibility / offscreen pause ──
  function resize() {
    [W, H] = size();
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H, false); composer.setSize(W, H);
  }
  if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(resize); ro.observe(ownCanvas ? host : canvas); cleanups.push(() => ro.disconnect()); }
  else on(window, 'resize', resize);
  const kick = () => { if (!disposed && !running && visible && onScreen) { running = true; raf = requestAnimationFrame(loop); } };
  on(document, 'visibilitychange', () => { visible = !document.hidden; kick(); });
  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver((es) => { onScreen = es.some((e) => e.isIntersecting); kick(); });
    io.observe(canvas); cleanups.push(() => io.disconnect());
  }

  // ── animation ──
  const tmpDir = new THREE.Vector3(), tmpLook = new THREE.Vector3(), tmpCol = new THREE.Color(), tmpCol2 = new THREE.Color(), washCol = new THREE.Color(0xff2a00);
  const timer = new THREE.Timer(); timer.connect?.(document); cleanups.push(() => timer.dispose?.());
  const beatLen = 60 / MUSIC.bpm;
  const riserLED = scene.getObjectByName('riserLED');
  let last = 0, frames = 0, camT = 0;

  function update(time, dt) {
    const beat = time / beatLen, bf = beat % 1, kickv = Math.exp(-bf * 6);
    const phrase = Math.floor(beat / 32), bip = beat % 32;
    const pal = palettes[phrase % palettes.length];
    const pattern = phrase % 3;
    for (const m of show.movers) {
      const i = m.i, side = m.pos.x < 0 ? -1 : 1;
      let pan, tilt;
      if (pattern === 0) { pan = Math.sin(time * 0.9 + i * 0.7) * 0.55; tilt = 0.35 + Math.sin(time * 0.6 + i) * 0.25; }
      else if (pattern === 1) { pan = side * (0.25 + 0.3 * Math.sin(time * 1.4)); tilt = 0.25 + 0.3 * Math.abs(Math.sin(time * 0.7 + i * 0.5)); }
      else { pan = Math.sin(time * 2.2 + i * Math.PI / 3) * 0.4; tilt = 0.45 + Math.cos(time * 2.2 + i * Math.PI / 3) * 0.3; }
      tmpDir.set(Math.sin(pan), -Math.cos(tilt) - 0.25, Math.sin(tilt) * 1.2).normalize();
      m.light.target.position.copy(m.pos).addScaledVector(tmpDir, 10);
      m.beam.lookAt(m.light.target.position);
      m.head.lookAt(m.light.target.position); m.head.rotateX(Math.PI / 2);
      m.lens.position.copy(m.pos).addScaledVector(tmpDir, 0.18); m.lens.lookAt(m.light.target.position);
      const c = pal[i % 2];
      const lit = pattern === 2 ? (Math.floor(beat) + i) % 2 === 0 || bf < 0.5 : true;
      const k = lit ? 0.75 + 0.35 * kickv : 0.08;
      m.light.color.setHex(c); m.light.intensity = 700 * k;
      m.beam.material.uniforms.color.value.setHex(c); m.beam.material.uniforms.intensity.value = 0.55 * k;
      m.lens.material.color.setHex(c).multiplyScalar(2 + 4 * k);
    }
    for (const w of show.washes) w.light.intensity = w.base * (0.45 + 0.75 * kickv);
    for (const u of show.up) u.intensity = 150 * (0.6 + 0.5 * kickv);
    riserLED.material.color.setRGB(3 * (0.3 + kickv), 0.15 * (0.3 + kickv), 0);
    const strobeOn = o.strobe !== false && !reducedMotion && bip >= 28 && (beat * 4) % 1 < 0.3;
    show.strobeLight.intensity = strobeOn ? 6000 : 0;
    show.strobeMat.color.setScalar(strobeOn ? 12 : 0.03);
    const laserOn = bip < 16;
    show.laserGroup.visible = laserOn;
    if (laserOn) {
      const n = show.lasers.length;
      show.lasers.forEach((g, i) => {
        const yaw = (i / (n - 1) - 0.5) * 1.1 + Math.sin(time * 0.5) * 0.18;
        const pitch = -0.1 + Math.sin(time * 1.1 + i * 0.15) * 0.08;
        g.rotation.set(pitch, yaw, 0, 'YXZ');
      });
    }
    tmpCol.setHex(pal[0]).lerp(washCol, 0.6).multiplyScalar(0.5 + 0.2 * kickv);
    show.hazeMat.color.copy(tmpCol);
    for (const h of show.haze) {
      h.position.addScaledVector(h.userData.v, dt);
      if (Math.abs(h.position.x) > 10) h.userData.v.x *= -1;
      if (h.position.z < -19 || h.position.z > 9) h.userData.v.z *= -1;
    }
    show.sodium.intensity = 25 * (Math.sin(time * 37) > 0.97 ? 0.2 : 1);
    if (whGLB?.userData.setSkyColor) {
      // skylight light boxes: slow hue sweep, pulled towards the current palette each phrase, breathing with the kick
      const sk = WAREHOUSE.glb.skylight ?? {};
      const hue = (time / (sk.cycleSeconds ?? 24)) % 1;
      tmpCol.setHSL(hue, sk.saturation ?? 0.75, sk.lightness ?? 0.6);
      tmpCol2.setHex(pal[phrase % 2 === 0 ? 0 : 1]);
      tmpCol.lerp(tmpCol2, 0.35);
      whGLB.userData.setSkyColor(tmpCol, 0.85 + 0.25 * kickv);
      for (const l of skyLights) l.color.copy(tmpCol);
      hemi.color.copy(tmpCol).lerp(tmpCol2.setScalar(1), 0.4); // the room picks up the skylight colour
    }
    show.crowd?.update(beat);
    dj.update(beat, dt);
    for (const m of rigMixers) m.update(dt);
    grain.uniforms.time.value = time;
  }

  function loop() {
    running = false;
    if (disposed || !visible || !onScreen) return;
    timer.update(); const now = timer.getElapsed();
    const f0 = performance.now();
    const dt = Math.min(Math.max(now - last, 0), 0.1); last = now;
    const time = o.frozenT ?? now;
    update(time, o.frozenT != null ? 0 : dt);
    if (embed) {
      if (camMode === 'user') {
        controls.update(); clampCam();
        if (orbit && controls.state === -1 && performance.now() - lastInput > IDLE) resumeOrbit();
      } else {
        if (orbit) camT += dt;
        embedCameraPos(CAMERA.embed, camT, camera.position);
        let look = embedTarget;
        if (camMode === 'blend') {
          blend.t += dt; const u = Math.min(blend.t / blend.dur, 1), e = u * u * (3 - 2 * u);
          camera.position.lerpVectors(blend.pos, camera.position, e);
          look = tmpLook.lerpVectors(blend.tgt, embedTarget, e);
          if (u >= 1) camMode = 'auto';
        }
        camera.lookAt(look); controls?.target.copy(look);
      }
    } else if (inIntro) {
      introT += dt;
      const u = Math.min(introT / CAMERA.intro.duration, 1), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      camera.position.copy(introPath.getPointAt(e)); camera.lookAt(introLook.getPointAt(e));
      if (u >= 1) endIntro();
    } else { controls.update(); clampCam(); }
    composer.render();
    api.frameMs = performance.now() - f0;
    if (++frames === 4) { api.ready = true; o.onReady?.(api); }
    if (o.still && frames >= 4) return;
    running = true; raf = requestAnimationFrame(loop);
  }
  kick();
  return api;
}
