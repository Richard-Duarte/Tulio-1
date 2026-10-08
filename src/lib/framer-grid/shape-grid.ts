import * as THREE from "three";
import { SubstrateMaterial } from "./substrate-material";
import type { ThreeStage } from "./three-stage";

export type GridShapeType = "triangle" | "square" | "hexagon" | "circle";

export type GridSceneConfig = {
  type?: GridShapeType;
  n?: number;
  padding?: number;
  colors?: (string | number)[];
  light1Color?: string | number;
  light1Intensity?: number;
  light1PositionZ?: number;
  light2Color?: string | number;
  light2Intensity?: number;
  light2PositionZ?: number;
  depthScale?: number;
  timeCoef?: number;
  materialParams?: THREE.MeshPhysicalMaterialParameters;
};

const DEFAULT_CONFIG = {
  type: "hexagon" as GridShapeType,
  n: 20,
  padding: 0,
  light1Color: 0xffffff,
  light1Intensity: 1000,
  light1PositionZ: 5,
  light2Color: 0xff0000,
  light2Intensity: 500,
  light2PositionZ: -20,
  colors: [0x0000ff, 0x202020, 0xffffff],
  materialParams: { metalness: 0.8, roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.1 },
  timeCoef: 1,
  depthScale: 1,
  tiltRotationX: 0.15,
  tiltRotationY: 0.15,
};

function fillGrid<T>({ nx, ny }: { nx: number; ny: number }, fn: (x: number, y: number) => T) {
  const out: T[] = [];
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) out.push(fn(x, y));
  }
  return out;
}

function createCellGeometry(
  sides: number,
  radius: number,
  depth: number,
  cornerR = 0,
  cornerI = 0,
  segments = 3,
) {
  const points: THREE.Vector2[] = [];
  points.push(new THREE.Vector2(radius, -depth / 2));
  for (let i = 0; i < segments; i++) {
    const x = radius - cornerR + Math.cos((i / (segments - 1)) * (Math.PI / 2)) * cornerR;
    const y = depth / 2 - cornerI + Math.sin((i / (segments - 1)) * (Math.PI / 2)) * cornerI;
    points.push(new THREE.Vector2(x, y));
  }
  points.push(new THREE.Vector2(0, depth / 2));

  // Framer shared-lib: LatheGeometry(profile, sides) — sides = triangle/hex/square/circle count.
  const geometry = new THREE.LatheGeometry(points, sides);
  geometry.translate(0, -depth / 2, 0);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function triangleLayout(config: {
  nx: number;
  ny: number;
  width: number;
  height: number;
  radius: number;
}) {
  const { nx, ny, width, height, radius } = config;
  const halfW = width / 2;
  const rowH = height;
  const startX = (-nx / 2) * halfW + halfW / 2;
  const startY = (-ny / 2) * rowH + rowH / 2;
  return fillGrid({ nx, ny }, (x, y) => ({
    x: startX + x * halfW,
    y:
      startY +
      y * rowH +
      0.5 * (y % 2 ? -1 : 1) * (rowH - radius) +
      (x % 2) * (y % 2 ? 1 : -1) * (2 * radius - rowH),
    rotZ: ((x + (y % 2)) % 2) * (Math.PI / 3),
  }));
}

function squareLayout(config: { nx: number; ny: number; width: number; height: number }) {
  const { nx, ny, width, height } = config;
  const cellW = width;
  const cellH = height / 2;
  const startX = (-nx / 2) * cellW + cellW / 4;
  const startY = (-ny / 2) * cellH + cellH / 2;
  return fillGrid({ nx, ny }, (x, y) => ({
    x: startX + x * cellW + (y % 2) * 0.5 * cellW,
    y: startY + y * cellH,
    rotZ: 0,
  }));
}

function hexLayout(config: { nx: number; ny: number; radius: number }) {
  const { nx, ny, radius } = config;
  const colW = Math.cos(Math.PI / 6) * radius * 2;
  const rowH = 1.5 * radius;
  const startX = (-nx / 2) * colW + colW / 4;
  const startY = (-ny / 2) * rowH + rowH / 2;
  return fillGrid({ nx, ny }, (x, y) => ({
    x: startX + x * colW + (y % 2) * 0.5 * colW,
    y: startY + y * rowH,
    rotZ: 0,
  }));
}

function circleLayout(config: { nx: number; ny: number; radius: number }) {
  const { nx, ny, radius } = config;
  const colW = 2 * radius;
  const rowH = Math.sin(Math.PI / 3) * colW;
  const startX = (-nx / 2) * colW + colW / 4;
  const startY = (-ny / 2) * rowH + rowH / 2;
  return fillGrid({ nx, ny }, (x, y) => ({
    x: startX + x * colW + (y % 2) * 0.5 * colW,
    y: startY + y * rowH,
    rotZ: 0,
  }));
}

function colorGradient(colors: (string | number)[]) {
  const parsed = colors.map((c) => new THREE.Color(c));
  return {
    getColorAt(t: number, target = new THREE.Color()) {
      const clamped = Math.max(0, Math.min(1, t));
      const idx = clamped * (parsed.length - 1);
      const i = Math.floor(idx);
      const c0 = parsed[i];
      if (i >= parsed.length - 1) return c0.clone();
      const c1 = parsed[i + 1];
      const f = idx - i;
      target.r = c0.r + f * (c1.r - c0.r);
      target.g = c0.g + f * (c1.g - c0.g);
      target.b = c0.b + f * (c1.b - c0.b);
      return target;
    },
  };
}

type LayoutCell = { x: number; y: number; rotZ: number };

export class ShapeGrid extends THREE.InstancedMesh {
  config: typeof DEFAULT_CONFIG & Record<string, number | GridShapeType>;
  light1: THREE.PointLight;
  light2: THREE.PointLight;
  pointerPosition = new THREE.Vector3();
  tilt = new THREE.Vector3();

  #stage: ThreeStage;
  #time = 0;
  #layout: LayoutCell[];
  #phases: Float32Array;
  #dummy = new THREE.Object3D();

  constructor(stage: ThreeStage, options: GridSceneConfig = {}) {
    const config = { ...DEFAULT_CONFIG, ...options } as ShapeGrid["config"];
    let sides: number;
    if (config.type === "triangle") {
      sides = 3;
      config.width = 100 / (config.n / 2 + 0.5);
      config.height = Math.sin(Math.PI / 3) * config.width;
      config.radius = 0.5 * config.width / Math.cos(Math.PI / 6);
      config.nx = config.n;
      config.ny = Math.floor((3 * config.n) / 5);
    } else if (config.type === "square") {
      sides = 4;
      config.width = 100 / config.n;
      config.height = 100 / config.n;
      config.radius = 0.5 * config.width;
      config.nx = config.n;
      config.ny = Math.floor(2 * config.n);
    } else {
      sides = config.type === "hexagon" ? 6 : 16;
      config.radius = 50 / config.n;
      config.nx = config.n;
      config.ny = config.n;
    }

    const geometry = createCellGeometry(
      sides,
      config.radius,
      10 * config.radius,
      0.125 * config.radius,
      0.125 * config.radius,
    );

    const material = new SubstrateMaterial({
      ...config.materialParams,
      side: THREE.DoubleSide,
      vertexColors: true,
      color: 0xffffff,
    });

    super(geometry, material, config.nx * config.ny);
    this.#stage = stage;
    this.config = config;
    this.frustumCulled = false;

    this.#layout = this.#buildLayout();
    this.#phases = new Float32Array(
      Array.from({ length: this.count }, () => THREE.MathUtils.randFloatSpread(2 * Math.PI)),
    );

    this.light1 = new THREE.PointLight(config.light1Color, config.light1Intensity);
    this.light1.position.z = config.light1PositionZ;
    stage.scene.add(this.light1);

    this.light2 = new THREE.PointLight(config.light2Color, config.light2Intensity);
    this.light2.position.z = config.light2PositionZ;
    stage.scene.add(this.light2);

    if (options.colors) this.setColors(options.colors);
  }

  #buildLayout(): LayoutCell[] {
    const c = this.config;
    if (c.type === "triangle") {
      return triangleLayout({
        nx: c.nx,
        ny: c.ny,
        width: c.width,
        height: c.height,
        radius: c.radius,
      });
    }
    if (c.type === "square") {
      return squareLayout({ nx: c.nx, ny: c.ny, width: c.width, height: c.height });
    }
    if (c.type === "hexagon") {
      return hexLayout({ nx: c.nx, ny: c.ny, radius: c.radius });
    }
    return circleLayout({ nx: c.nx, ny: c.ny, radius: c.radius });
  }

  setColors(colors: (string | number)[]) {
    if (!Array.isArray(colors) || colors.length < 2) return;
    const gradient = colorGradient(colors);
    for (let i = 0; i < this.count; i++) {
      this.setColorAt(i, gradient.getColorAt(Math.random()));
    }
    this.instanceColor!.needsUpdate = true;
  }

  resize() {
    if (this.#stage.size.ratio > 1) {
      this.scale.x = (this.#stage.size.wWidth / 100) * 1.4;
      this.scale.y = this.scale.x;
    } else {
      this.scale.y = (this.#stage.size.wHeight / 100) * 1.4;
      this.scale.x = this.scale.y;
    }
  }

  update(tick: { delta: number }) {
    this.#time += tick.delta * this.config.timeCoef;
    this.rotation.set(0, 0, 0);
    const follow = 1 - Math.exp(-Math.max(tick.delta, 0.016) * 6);
    this.light1.position.x += (this.pointerPosition.x - this.light1.position.x) * follow;
    this.light1.position.y += (this.pointerPosition.y - this.light1.position.y) * follow;

    for (let x = 0; x < this.config.nx; x++) {
      for (let y = 0; y < this.config.ny; y++) {
        const index = x * this.config.ny + y;
        const cell = this.#layout[index];
        this.#dummy.position.set(
          cell.x,
          cell.y,
          0.5 * (Math.cos(this.#phases[index] + this.#time) - 1) * this.config.radius * this.config.depthScale,
        );
        this.#dummy.rotation.z = cell.rotZ;
        const pad = 1 - this.config.padding;
        this.#dummy.scale.set(pad, pad, 1);
        this.#dummy.updateMatrix();
        this.setMatrixAt(index, this.#dummy.matrix);
      }
    }
    this.instanceMatrix.needsUpdate = true;
  }
}
