import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Section photo. Pointer interaction ported from the Framer image grid
 * (smoothness 0.4, radius 0.25, strength 0.1, relaxation 0.925,
 * displacement 0.015, aberration 0.15) with triangular tiles instead of rectangles.
 */
const GRID = 20;
const SMOOTHNESS = 0.4;
const MOUSE_RADIUS = 0.25;
const STRENGTH = 0.1;
const RELAXATION = 0.925;
const DISPLACEMENT = 0.015;
const ABERRATION = 0.15;

const VERTEX = /* glsl */ `
  attribute vec2 aShift;
  varying vec2 vUv;
  varying vec2 vShift;
  void main() {
    vUv = uv;
    vShift = aShift;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uDisplace;
  uniform float uAberr;
  varying vec2 vUv;
  varying vec2 vShift;
  void main() {
    vec2 shift = uDisplace * vShift;
    vec2 split = shift * uAberr;
    float r = texture2D(uTexture, vUv - shift + split).r;
    float g = texture2D(uTexture, vUv - shift).g;
    float b = texture2D(uTexture, vUv - shift - split).b;
    gl_FragColor = vec4(r, g, b, 1.0);
  }
`;

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function coverUv(vx: number, vyBottom: number, viewAspect: number, imageAspect: number) {
  let u = vx;
  let v = vyBottom;
  if (imageAspect > 0 && viewAspect > imageAspect) {
    const span = imageAspect / viewAspect;
    v = (vyBottom - 0.5) * span + 0.5;
  } else if (imageAspect > 0) {
    const span = viewAspect / imageAspect;
    u = (vx - 0.5) * span + 0.5;
  }
  return [u, v] as const;
}

function gridCounts(viewAspect: number) {
  const aspect = Number.isFinite(viewAspect) && viewAspect > 0 ? viewAspect : 1;
  const cols = aspect >= 1 ? Math.max(2, Math.round(GRID * aspect)) : GRID;
  const rows = aspect >= 1 ? GRID : Math.max(2, Math.round(GRID / aspect));
  return { cols, rows };
}

/** Offset-row lattice so each face is a triangle covering the photo. */
function buildTriangleMesh(viewAspect: number, imageAspect: number) {
  const { cols, rows } = gridCounts(viewAspect);
  const dx = 1 / cols;
  const dy = 1 / rows;
  const point = (i: number, j: number): [number, number] => [
    (i + (j & 1) * 0.5) * dx,
    j * dy,
  ];

  const corners: [number, number][] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = -1; i < cols; i++) {
      const [x0, y0] = point(i, j);
      const [x1, y1] = point(i + 1, j);
      const [x2, y2] = point(i, j + 1);
      const [x3, y3] = point(i + 1, j + 1);
      if ((j & 1) === 0) {
        corners.push([x0, y0], [x1, y1], [x2, y2]);
        corners.push([x1, y1], [x3, y3], [x2, y2]);
      } else {
        corners.push([x0, y0], [x1, y1], [x3, y3]);
        corners.push([x0, y0], [x3, y3], [x2, y2]);
      }
    }
  }

  const triCount = corners.length / 3;
  const positions = new Float32Array(triCount * 9);
  const uvs = new Float32Array(triCount * 6);
  const centroids = new Float32Array(triCount * 2);

  for (let t = 0; t < triCount; t++) {
    let cx = 0;
    let cy = 0;
    for (let v = 0; v < 3; v++) {
      const [vx, vyTop] = corners[t * 3 + v];
      const pi = t * 9 + v * 3;
      positions[pi] = vx * 2 - 1;
      positions[pi + 1] = (1 - vyTop) * 2 - 1;
      positions[pi + 2] = 0;
      const [u, vv] = coverUv(vx, 1 - vyTop, viewAspect, imageAspect);
      const ui = t * 6 + v * 2;
      uvs[ui] = u;
      uvs[ui + 1] = vv;
      cx += vx;
      cy += vyTop;
    }
    centroids[t * 2] = (cx / 3) * cols;
    centroids[t * 2 + 1] = (cy / 3) * rows;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  const shifts = new Float32Array(triCount * 6);
  geometry.setAttribute("aShift", new THREE.BufferAttribute(shifts, 2));
  return { geometry, centroids, triCount, cols, rows };
}

export function NocturnaHeroVisual({ imageUrl }: { imageUrl?: string | null }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !imageUrl) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = document.createElement("canvas");
    canvas.className = "pointer-events-none absolute inset-0 z-[1] h-full w-full";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.opacity = "0";
    host.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setClearColor(0x000000, 1);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const scene = new THREE.Scene();
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uDisplace: { value: DISPLACEMENT },
        uAberr: { value: ABERRATION },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
    mesh.frustumCulled = false;
    scene.add(mesh);

    const loader = new THREE.TextureLoader();
    let disposed = false;
    let imageAspect = 1;
    let centroids = new Float32Array();
    let triCount = 0;
    let triShift = new Float32Array();
    let cols = GRID;
    let rows = GRID;
    const radius = GRID * MOUSE_RADIUS;
    const radiusSq = radius * radius;

    const pointer = { x: 0.5, y: 0.5, px: 0.5, py: 0.5 };
    const tween = { fromX: 0.5, fromY: 0.5, toX: 0.5, toY: 0.5, elapsed: SMOOTHNESS };

    const rebuild = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width < 2 || height < 2) return;
      renderer.setSize(width, height, false);
      const next = buildTriangleMesh(width / height, imageAspect);
      mesh.geometry.dispose();
      mesh.geometry = next.geometry;
      centroids = next.centroids;
      triCount = next.triCount;
      cols = next.cols;
      rows = next.rows;
      triShift = new Float32Array(triCount * 2);
    };

    const texture = loader.load(imageUrl, (loaded) => {
      if (disposed) return;
      const image = loaded.image as HTMLImageElement;
      const w = image.naturalWidth || image.width || 1;
      const h = image.naturalHeight || image.height || 1;
      imageAspect = w / h;
      loaded.colorSpace = THREE.NoColorSpace;
      loaded.minFilter = THREE.LinearFilter;
      loaded.magFilter = THREE.LinearFilter;
      loaded.generateMipmaps = false;
      loaded.wrapS = THREE.ClampToEdgeWrapping;
      loaded.wrapT = THREE.ClampToEdgeWrapping;
      material.uniforms.uTexture.value = loaded;
      rebuild();
      canvas.style.opacity = "1";
    });

    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      tween.fromX = pointer.x;
      tween.fromY = pointer.y;
      tween.toX = (event.clientX - rect.left) / rect.width;
      tween.toY = (event.clientY - rect.top) / rect.height;
      tween.elapsed = 0;
    };
    const onLeave = () => {
      tween.elapsed = SMOOTHNESS;
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let last = performance.now();
    let running = false;

    const frame = (now: number) => {
      raf = 0;
      if (disposed || !running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (tween.elapsed < SMOOTHNESS) {
        tween.elapsed += dt;
        const eased = easeOutCubic(Math.min(1, tween.elapsed / SMOOTHNESS));
        pointer.x = tween.fromX + (tween.toX - tween.fromX) * eased;
        pointer.y = tween.fromY + (tween.toY - tween.fromY) * eased;
      }
      const vx = pointer.x - pointer.px;
      const vy = pointer.y - pointer.py;
      pointer.px = pointer.x;
      pointer.py = pointer.y;

      const mx = pointer.x * cols;
      const my = pointer.y * rows;
      const attr = mesh.geometry.getAttribute("aShift") as THREE.BufferAttribute | undefined;
      if (attr && triCount > 0) {
        const data = attr.array as Float32Array;
        for (let t = 0; t < triCount; t++) {
          let sx = triShift[t * 2] * RELAXATION;
          let sy = triShift[t * 2 + 1] * RELAXATION;
          const dx = mx - centroids[t * 2];
          const dy = my - centroids[t * 2 + 1];
          const distSq = dx * dx + dy * dy;
          if (distSq < radiusSq && distSq > 1e-6) {
            const falloff = Math.min(10, radius / Math.sqrt(distSq));
            sx += STRENGTH * 100 * vx * falloff;
            sy -= STRENGTH * 100 * vy * falloff;
          }
          triShift[t * 2] = sx;
          triShift[t * 2 + 1] = sy;
          const o = t * 6;
          data[o] = data[o + 2] = data[o + 4] = sx;
          data[o + 1] = data[o + 3] = data[o + 5] = sy;
        }
        attr.needsUpdate = true;
      }

      if (material.uniforms.uTexture.value) renderer.render(scene, camera);
      if (running) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || disposed) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const resizeObserver = new ResizeObserver(() => rebuild());
    resizeObserver.observe(host);
    const intersection = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
        else stop();
      },
      { threshold: 0.01 },
    );
    intersection.observe(host);
    rebuild();

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (host.getBoundingClientRect().height > 0) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      scene.remove(mesh);
      mesh.geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [imageUrl]);

  return (
    <div ref={hostRef} className="nc-hero-visual relative min-h-[320px] overflow-hidden md:min-h-full">
      {imageUrl ? (
        <img src={imageUrl} alt="Tulio no set" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="nc-dither-fallback absolute inset-0" aria-hidden />
      )}
    </div>
  );
}
