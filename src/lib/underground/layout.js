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
  eaveHeight: 4.8,    // wall height at the sides (chain hoists reach up to here)
  ridgeHeight: 10.5,  // roof peak
  bays: 6,            // number of structural bays along Z (columns + trusses)
  skylightBays: [1, 3, 4], // bays that get a (dirty) roof skylight
  // Venue model (replaces the procedural warehouse). Tulio: brutalist concrete interior.
  // Native size 40.8 x 42.2 m with a 3.6 m ceiling; scaled up so the ceiling clears the light truss,
  // then pushed along +Z so its back wall sits behind the booth (z ≈ -20) like the warehouse end wall.
  glb: {
    url: 'models/brutalist-interior.glb',
    autoDetect: true,  // probe for the file at startup (a missing file logs one harmless 404); false = always procedural
    fitLength: 66,     // auto-scale so the model's longest horizontal side = this (null = keep scale) → inner ceiling ≈ 4.85 m
    rotationY: Math.PI / 2, // the 5 skylight slots run along the model's X: turn them to run along Z (booth axis)
    offset: [3.5, 0, 11.6], // measured: inner back wall → z ≈ -20 (behind the booth), the 5 slots centred on x = 0 running z ≈ -15 … 11 over the floor
    emissive: 1.0,     // baked light pools (emissive slot), tinted live by the skylight colour …
    emissiveGamma: 2.2, // … with a power curve so the grey concrete bake doesn't feed the bloom
    // The ceiling slots are open: a colour-cycling light panel above the slab is what shows through them.
    skylight: {
      depth: 0.25, intensity: 1.35, cycleSeconds: 24, saturation: 0.75, lightness: 0.6,
      lights: [[-6, -10], [6, -10], [-6, 2], [6, 2]], lightIntensity: 22, // point lights under the slots (x, z)
    },
    tint: null,        // keep the concrete albedo as authored
    metalness: 0.15,   // cap the (very high) baked metalness: no environment map to reflect, it would render black
    fogDensity: 0.014, // thinner fog than the warehouse so the concrete hall and its skylight slots read
    hemi: 0.45,        // more ambient than the warehouse so the concrete reads
    hazeOpacity: 0.06,
    credit: '“Brutalist Interior” — Sketchfab',
  },
};

// Model files + real-world size normalization.
export const MODELS = {
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
    // Tulio (modelled from his reference photo): black tee, dark pants, cord necklace with a silver bar, black smartwatch.
    // Colours are baked into the model. Optional: material name → colour multiplier; mesh names hidden.
    materialTint: {},
    hideMeshes: [],
    // Baked clip (DJ_Dance_128BPM, 16 beats) is locked to the scene beat clock (MUSIC.bpm):
    // one hand rides the mixer (EQ / filter / fader) while the other works the CDJ jog + pitch,
    // knee bounce + hip sway and a head nod on every kick (IK-baked, seamless 16-beat loop).
    clipName: 'DJ_Dance_128BPM', clipBpm: 128, clipBeats: 16,
    // Legacy fist-pump switch (the current clip has no fist pump): 1 = play the clip as baked,
    // 0 = right arm + head replay clip beats 3-7 over beats 11-15.
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

// Sub layouts. 'front': 10 subs laid on their side (wide), one continuous row along the front of the riser
// (5 per side of the centre line). 'row' = the old straight row of 6 upright.
// Sub fields: x/z = centre of the footprint, rotY, level (0 = floor, 1 = stacked), lay: true = on its side.
export const SUB_LAYOUT = 'front';

const SUB_W = 0.97; // sub width when laid on its side (model is 0.95 m tall upright) + a small gap
const FRONT_COUNT = 10; // subs in the front row
export const SUB_LAYOUTS = {
  front: {
    subs: Array.from({ length: FRONT_COUNT }, (_, i) => ({
      x: (i - (FRONT_COUNT - 1) / 2) * SUB_W, z: -16.16, rotY: 0, level: 0, lay: true,
    })),
    tops: [],
  },
  row: {
    subs: [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((i) => ({ x: i * 0.82, z: -15.9, rotY: 0, level: 0 })),
    tops: [],
  },
};

// DJ monitors (monitors.js, procedural): one stack per side of the booth on the riser, aimed at the DJ's head.
// Each = compact sub on the riser floor + black pole from its top centre + 2 compact line-array cells
// (same wedge cabinet as the flown hangs, smaller) with a slight downward J-curve and a small red badge.
export const MONITORS = {
  enabled: true,
  positions: [[-1.32, -17.42], [1.32, -17.42]], // [x, z] on the riser (riser top y = 0.6)
  aimAt: [0, 2.3, -17.76],                     // DJ's head; each stack yaws + the cells pitch towards it
  sub: { w: 0.52, h: 0.62, d: 0.58 },
  poleLength: 0.78,                            // from the sub top to the cell yoke
  cell: { w: 0.5, h: 0.155, d: 0.34, backH: 0.115 },
  splayDeg: 4,                                 // angle between the two cells
};

// Flown line arrays (procedural, lineArray.js): one hang per side, above the outer front subs,
// hung from the ceiling on two chain hoists. Cabinet = wedge box (front height h, back height backH, depth d).
// splayDeg = inter-cabinet angles from the top down (J-curve aimed at the dance floor); rotY toes each hang in.
export const LINE_ARRAY = {
  enabled: true,
  count: 6,
  box: { w: 0.92, h: 0.27, d: 0.56, backH: 0.2 },
  gap: 0.008,
  splayDeg: [1.5, 3, 4.5, 6, 7],
  topY: 4.3,         // fly bar height (inner ceiling ≈ 4.85 m)
  ceilingY: 4.85,    // hoist chains run up to here
  hangs: [
    { x: -4.25, z: -16.45, rotY: 0.2, tilt: 1 },
    { x: 4.25, z: -16.45, rotY: -0.2, tilt: 1 },
  ],
};

// Lighting truss hanging over the dance floor (rectangle, box-truss section).
export const LIGHT_TRUSS = {
  y: 4.3, x: [-6, 6], z: [-14.5, -3.5], section: 0.3, // under the brutalist ceiling (inner ≈ 4.85 m)
  movers: [ // moving heads hung under the truss
    [-4.5, -14.5], [-1.5, -14.5], [1.5, -14.5], [4.5, -14.5],
    [-6, -8], [6, -8],
  ],
  washes: [ // red / amber washes aimed at the booth sides (monitors, subs, line arrays)
    { pos: [-3, -14.5], target: [-3, 1.3, -17], color: 0xff1a00 },
    { pos: [3, -14.5], target: [3, 1.3, -17], color: 0xff1a00 },
    { pos: [0, -14.5], target: [0, 0.2, -15.6], color: 0xff6a00, angle: 0.3 }, // aimed low: riser front + front subs, DJ only gets the edge
  ],
  strobes: [[-3, -3.5], [3, -3.5], [0, -14.5]],
};

// Triangle mark on the inner back wall, above the booth, facing the dance floor (+Z).
export const BACK_LOGO = { url: '/brand/tulio-mark.png', position: [0, 3.15, -19.45], size: 2.4 };

export const MUSIC = { bpm: 128 };

// Dancers: `count` (quality 'high') / `lowCount` (quality 'low'); denser near the booth (front of z range),
// `spacing` = min distance between dancers at the front / back of the floor.
export const CROWD = { enabled: true, count: 460, lowCount: 200, x: [-7.8, 7.8], z: [-16.2, 5.5], spacing: [0.46, 0.72] };

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
    stacks: { pos: [-0.8, 1.9, -12.2], target: [-3.0, 1.2, -16.9], fov: 45 },
    monitor: { pos: [-2.6, 2.2, -15.4], target: [-1.1, 1.55, -17.5], fov: 40 },
    atmo: { pos: [-6.5, 1.3, 3.5], target: [1, 4.2, -16] },
    dancefloor: { pos: [0.6, 1.7, -7.5], target: [0, 1.9, -17] },
  },
};
