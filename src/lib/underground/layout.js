// ─────────────────────────────────────────────────────────────────────────────
//  LAYOUT CONFIG — every position / size in the scene lives here.
//  Units: meters. Floor is y = 0. Warehouse is centered on the origin,
//  its long axis runs along Z. The DJ booth sits against the -Z end wall and
//  faces +Z (towards the dance floor).
//  All models are authored facing +Z, so rotY = 0 means "facing the crowd".
// ─────────────────────────────────────────────────────────────────────────────

export const WAREHOUSE = {
  width: 24,          // X
  length: 40,         // Z
  eaveHeight: 8,      // wall height at the sides
  ridgeHeight: 10.5,  // roof peak
  bays: 6,            // number of structural bays along Z (columns + trusses)
  skylightBays: [1, 3, 4], // bays that get a (dirty) roof skylight
  // Drop public/models/warehouse.glb in and it replaces the procedural placeholder.
  glb: {
    url: 'models/warehouse.glb',
    autoDetect: true,  // probe for the file at startup (a missing file logs one harmless 404); false = always procedural
    fitLength: 40,     // auto-scale so the model's longest horizontal side = this (null = keep scale)
    rotationY: 0,      // rotate if the model's long axis is not Z
    offset: [0, 0, 0], // manual nudge after auto-centering
    credit: '“Abandoned Warehouse Building” by jimbogies — Sketchfab (Standard license)',
  },
};

// Model files + real-world size normalization.
export const MODELS = {
  top: { url: 'models/funktion-one-res2.glb', height: 1.1 },       // Funktion One Res 2 top
  sub: { url: 'models/cerwin-vega-speaker.glb', height: 0.95, tint: 0.3 }, // Cerwin-Vega folded-horn bass bin; tint darkens its light-grey carpet
  // Contains 2x CDJ-3000 + DJM-A9 mixer + cables. Native unit ≈ 7.33 m per meter;
  // 0.1365 makes one CDJ 0.33 m wide x 0.45 m deep (real CDJ-3000: 329 x 453 mm).
  djSetup: { url: 'models/pioneer-cdj3000-djm-a9.glb', scale: 0.1365, keepOrigin: true },
};

export const BOOTH = {
  riser: { position: [0, 0, -18.2], size: [5, 0.6, 3] },   // [w, h, d], position = center of footprint
  table: { position: [0, 0.6, -17.25], size: [1.7, 0.95, 0.75] }, // position y = top of riser
  // DJ gear sits on the table. rotY = PI so the jog wheels face the DJ (who faces the crowd).
  djSetup: { offset: [0, 0, 0], rotY: Math.PI },
  // Used only if the DJ setup model fails to load.
  placeholderMixer: { size: [0.4, 0.1, 0.45] },
  // DJ character: loads public/models/dj.glb if present, otherwise a dark humanoid silhouette.
  // position y = top of the riser. rotY 0 = facing the dance floor (+Z); set to Math.PI if the model faces -Z.
  dj: {
    enabled: true, url: 'models/dj.glb',
    // dj.glb is a full-body rigged human (1.80 m, origin = between the feet, faces +Z, mixamo bone names).
    // Standing on the riser (y 0.6), belly just behind the table's back edge (z -17.625).
    position: [0, 0.6, -17.76], rotY: 0,
    scale: 1,            // real-world size already; `height` (m) would normalize instead
    keepOrigin: true,    // don't recentre on the bounding box (the arms reach forward)
    // Baked clip (DJ_Dance_128BPM, 16 beats) is locked to the scene beat clock (MUSIC.bpm):
    // jog/EQ/fader moves, bounce + head nod on every kick, right-fist pump to the crowd on clip beats 11-15.
    clipName: 'DJ_Dance_128BPM', clipBpm: 128, clipBeats: 16,
    // Right-arm fist pump (clip beats 11-15). 1 = as baked, 0 = right arm + head replay beats 3-7 instead.
    fistPump: 1,
    headPitch: 0,       // rad added to the baked head pose (+ = look down)
    // Fallbacks (placeholder silhouette / glb without clip): procedural animation, see djRig.js
    placeholderPosition: [0.05, 0.6, -17.8],
    bob: { amount: 0.025, nod: 0.12, sway: 0.04, lean: 0.22 },
    handTargets: { cdjX: 0.37, mixerX: 0.07, z: -0.13, y: 0.1 },
    fistPumpEvery: 16, // beats
    keyLight: { position: [0.9, 3.2, -15.7], target: [0, 2.05, -17.65], color: 0xffd6b8, intensity: 6, angle: 0.4 },
  },
  deskLamp: { position: [0, 1.9, -17.0], intensity: 0.25 }, // soft warm light so the gear reads
};

// Sub layouts. Switch SUB_LAYOUT to 'row' for a straight row of 6 in front of the booth.
//  'stacks': 2 subs stacked under each Funktion One top (tops sit on them) + 2 in front of the booth.
export const SUB_LAYOUT = 'stacks';

const STACK_X = 3.5, STACK_Z = -17.0, TOE_IN = 0.15;
export const SUB_LAYOUTS = {
  stacks: {
    subs: [
      { x: -STACK_X, z: STACK_Z, rotY: TOE_IN, level: 0 },
      { x: -STACK_X, z: STACK_Z, rotY: TOE_IN, level: 1 },
      { x: STACK_X, z: STACK_Z, rotY: -TOE_IN, level: 0 },
      { x: STACK_X, z: STACK_Z, rotY: -TOE_IN, level: 1 },
      { x: -0.42, z: -16.05, rotY: 0, level: 0 },
      { x: 0.42, z: -16.05, rotY: 0, level: 0 },
    ],
    // onSubs: number of subs under the top (elevation = onSubs * sub height). frontAlign: flush with sub front.
    tops: [
      { x: -STACK_X, z: STACK_Z, rotY: TOE_IN, onSubs: 2, frontAlign: true },
      { x: STACK_X, z: STACK_Z, rotY: -TOE_IN, onSubs: 2, frontAlign: true },
    ],
  },
  row: {
    subs: [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((i) => ({ x: i * 0.82, z: -15.9, rotY: 0, level: 0 })),
    // no subs underneath → tops go on a simple black plinth of standHeight
    tops: [
      { x: -STACK_X, z: STACK_Z, rotY: TOE_IN, standHeight: 1.4 },
      { x: STACK_X, z: STACK_Z, rotY: -TOE_IN, standHeight: 1.4 },
    ],
  },
};

// Lighting truss hanging over the dance floor (rectangle, box-truss section).
export const LIGHT_TRUSS = {
  y: 6.6, x: [-6, 6], z: [-14.5, -3.5], section: 0.3,
  movers: [ // moving heads hung under the truss
    [-4.5, -14.5], [-1.5, -14.5], [1.5, -14.5], [4.5, -14.5],
    [-6, -8], [6, -8],
  ],
  washes: [ // red / amber washes aimed at the booth + stacks
    { pos: [-3, -14.5], target: [-3.5, 1.5, -17], color: 0xff1a00 },
    { pos: [3, -14.5], target: [3.5, 1.5, -17], color: 0xff1a00 },
    { pos: [0, -14.5], target: [0, 0.2, -15.6], color: 0xff6a00, angle: 0.3 }, // aimed low: riser front + front subs, DJ only gets the edge
  ],
  strobes: [[-3, -3.5], [3, -3.5], [0, -14.5]],
};

export const LASER = { origin: [0, 3.4, -19.6], beams: 16, spread: 1.1, length: 30, color: 0x22ff55 };

export const MUSIC = { bpm: 128 };

// Dancers: `count` (quality 'high') / `lowCount` (quality 'low'); denser near the booth (front of z range),
// `spacing` = min distance between dancers at the front / back of the floor.
export const CROWD = { enabled: true, count: 300, lowCount: 120, x: [-7.8, 7.8], z: [-14.8, 5.5], spacing: [0.52, 0.85] };

// Camera presets. `intro` is the fly-through path; it ends on `dancefloor`.
export const CAMERA = {
  fov: 50,
  dancefloor: { pos: [0.6, 1.7, -7.5], target: [0, 1.9, -17] },
  intro: {
    duration: 10,
    path: [[10, 7.2, 18], [4, 6.2, 8], [-2.5, 4.2, -2], [0.4, 2.3, -6.5], [0.6, 1.7, -7.5]],
    look: [[0, 4, -10], [0, 3.2, -16], [0, 2.4, -17], [0, 2.0, -17], [0, 1.9, -17]],
  },
  // embed / background mode: slow automatic drift around the dance floor, always looking at the booth
  embed: { center: [0.3, 2.05, -7.2], radius: [2.4, 1.2], speed: [0.045, 0.031, 0.07], bob: 0.2, target: [0, 1.95, -17], fov: 48 },
  shots: { // used by the screenshot script via ?shot=<name>
    wide: { pos: [3.5, 4.6, -2.0], target: [-0.3, 1.5, -17] },
    booth: { pos: [0.85, 2.2, -15.1], target: [0, 1.72, -17.5] },
    mid: { pos: [1.0, 1.75, -11.8], target: [0, 1.95, -17.4], fov: 42 },
    stacks: { pos: [-0.8, 1.9, -12.2], target: [-3.6, 1.7, -16.9], fov: 45 },
    atmo: { pos: [-6.5, 1.3, 3.5], target: [1, 4.2, -16] },
    dancefloor: { pos: [0.6, 1.7, -7.5], target: [0, 1.9, -17] },
  },
};
