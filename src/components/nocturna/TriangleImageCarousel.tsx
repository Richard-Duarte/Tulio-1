import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import * as THREE from "three";

type CarouselProps = {
  images: string[];
  className?: string;
};

const IMAGE_SIZE = 86;
const THUMBNAIL_SIZE = 10;
const SPACING = 14;
const FOCUS_WIDTH = 248;
const SCATTER = 145;
const CENTER_X = 50;
const CENTER_Y = 50;
const SPEED = 10;
const DIRECTION: "right" | "left" = "right";
const SMOOTHING = 130;
const SEED = 7;
/** Smallest cluster scale at the start of the section 2 pin, relative to today's size. */
const ZOOM_MIN = 0.15;
/** How far below center the cluster sits when zoom progress is 0, as a fraction of viewport height. */
const ZOOM_DROP = 0.33;

function wrap(value: number, size: number) {
  return ((value % size) + size) % size;
}

function hash(index: number, seed: number) {
  const n = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/** Infinite image ribbon from the Framer carousel. The focused cluster forms a triangle. */
export function TriangleImageCarousel({ images, className = "" }: CarouselProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(0);
  const sources = images.filter(Boolean);
  const sourceKey = sources.join("\n");

  useEffect(() => {
    const el = containerRef.current;
    if (!el || sources.length === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;";
    el.appendChild(canvas);

    let disposed = false;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

    const scene = new THREE.Scene();
    const cluster = new THREE.Group();
    scene.add(cluster);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    camera.position.z = 600;
    const geometry = new THREE.PlaneGeometry(1, 1);
    const materials: THREE.MeshBasicMaterial[] = [];
    const aspects: number[] = [];
    const meshes: THREE.Mesh[] = [];
    const textures = new Set<THREE.Texture>();
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    let width = 702;
    let height = 342;
    let scale = 1;
    let gap = SPACING;
    let period = 1;
    let scroll = scrollRef.current;
    let target = scroll;
    let dragging = false;
    let pointerId: number | null = null;
    let lastX = 0;
    let frame = 0;
    let lastTime = 0;
    let loaded = 0;
    let failed = 0;

    const setStatus = (message: string) => {
      const node = statusRef.current;
      if (!node || disposed) return;
      node.textContent = message;
      node.style.display = message ? "grid" : "none";
    };

    const layout = () => {
      if (disposed || width <= 0 || height <= 0) return;
      const centerX = (CENTER_X / 100 - 0.5) * width;
      const centerY = (0.5 - CENTER_Y / 100) * height;
      const focus = Math.max(1, FOCUS_WIDTH * scale);
      const full = IMAGE_SIZE * scale;
      const tiny = THUMBNAIL_SIZE * scale;
      const scatter = SCATTER * scale;
      const half = focus * 0.78;
      const { zoom, offsetY, enter } = readZoom();
      const edge = width / 2;
      const core = Math.max(36, focus * 0.72);
      // Straight sides: apex at the top center, base horizontal, edges are linear.
      const apexY = scatter;
      const baseLine = -scatter * 0.92;

      for (let index = 0; index < meshes.length; index++) {
        const mesh = meshes[index];
        if (!mesh) continue;
        const x = wrap(index * gap + scroll + period / 2, period) - period / 2;
        const dx = Math.abs(x - centerX);
        const along = Math.min(1, dx / half);
        const past = Math.max(0, dx - half);
        const varied = full * (0.72 + hash(index + 11, SEED) * 0.28);
        const card = past > 0 ? tiny : Math.max(tiny, varied * (1 - along * 0.42));
        const aspect = aspects[index % sources.length] || 0.8;
        // Top of each card sits on the straight edge measured at its outer corner,
        // so wide cards do not bulge past the side.
        const outer = Math.min(half, dx + (card * aspect) / 2);
        const topY = apexY + (baseLine - apexY) * (outer / half);
        const fill = hash(index + 97, SEED);
        const depth = fill < 0.42 ? 0 : fill < 0.74 ? 1 : hash(index + 13, SEED);
        const room = Math.max(0, topY - baseLine - card);
        const y = past > 0 ? baseLine - card * 0.5 : topY - card * 0.5 - room * depth;
        const localX = x;
        const localY = centerY + y;
        const clusteredX = localX * zoom;
        const clusteredY = localY * zoom + offsetY;
        // Photos outside the triangle still arrive from the screen corners while zooming in.
        // Cards that form the sides stay on the straight edge.
        const travel =
          past > 0 ? enter * Math.min(1, past / Math.max(1, edge - half)) : 0;
        const t = travel;
        const side = localX < centerX ? -1 : 1;
        const zoomedSize = card * zoom;
        const travelSize = Math.max(zoomedSize, tiny * 2.4);
        const screenSize = zoomedSize + (travelSize - zoomedSize) * t;
        // Ribbon tails travel from the bottom screen corners into the triangle.
        const cornerX = side * (edge + screenSize * aspect * 0.65);
        const cornerY = -height / 2 - screenSize * 0.65;
        const worldX = clusteredX + (cornerX - clusteredX) * t;
        const worldY = clusteredY + (cornerY - clusteredY) * t;
        mesh.position.set(worldX, worldY, 0);
        mesh.scale.set(screenSize * aspect, screenSize, 1);
        mesh.renderOrder = Math.round((1 - along) * 1000) + hash(index + 5, SEED);
        const halfW = (screenSize * aspect) / 2;
        const halfH = screenSize / 2;
        mesh.visible =
          worldX + halfW > -edge - 8 &&
          worldX - halfW < edge + 8 &&
          worldY + halfH > -height / 2 - 8 &&
          worldY - halfH < height / 2 + 8;
      }
      renderer.render(scene, camera);
    };

    /**
     * Pin progress is how far the 260dvh section has moved through its runway
     * (section height minus one viewport). 0 = just pinned, 1 = runway finished.
     * smoothstep eases that into a cluster scale of 0.15 → 1 and a drop toward
     * the bottom of the viewport that returns to today's center.
     * Zoom is applied per photo. The group stays at identity so the renderer
     * is not rebuilt, and ribbon tails can reach the screen corner.
     */
    const readZoom = () => {
      cluster.scale.setScalar(1);
      cluster.position.set(0, 0, 0);
      const section = sectionRef.current;
      if (reduced || !section) {
        if (section) section.dataset.zoomProgress = "1";
        return { zoom: 1, offsetY: 0, enter: 0 };
      }
      const runway = section.offsetHeight - window.innerHeight;
      const progress =
        runway > 1 ? Math.min(1, Math.max(0, -section.getBoundingClientRect().top / runway)) : 1;
      const eased = progress * progress * (3 - 2 * progress);
      section.dataset.zoomProgress = progress.toFixed(3);
      return {
        zoom: ZOOM_MIN + (1 - ZOOM_MIN) * eased,
        offsetY: -(1 - eased) * height * ZOOM_DROP,
        enter: 1 - eased,
      };
    };

    const wrapScroll = () => {
      if (period <= 0) return;
      const turns = Math.floor(scroll / period);
      scroll -= turns * period;
      target -= turns * period;
      scrollRef.current = scroll;
    };

    const rebuild = () => {
      for (const mesh of meshes) cluster.remove(mesh);
      meshes.length = 0;
      if (!materials.length) return;
      const cover = Math.max(fullSize(), gap * 4);
      const count = Math.ceil((width + cover * 2) / gap);
      const copies = Math.ceil(count / materials.length) * materials.length;
      period = copies * gap;
      for (let index = 0; index < copies; index++) {
        const material = materials[index % materials.length];
        if (!material) continue;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        meshes.push(mesh);
        cluster.add(mesh);
      }
      wrapScroll();
    };

    function fullSize() {
      return Math.max(IMAGE_SIZE * scale * 3, gap * 4);
    }

    const resize = () => {
      if (disposed) return;
      const nextW = el.clientWidth;
      const nextH = el.clientHeight;
      if (nextW <= 0 || nextH <= 0) return;
      const previous = scale;
      width = nextW;
      height = nextH;
      const narrow = width < 760;
      // Full zoom fills the pinned viewport: height of the straight triangle, width of its base.
      const spine = SCATTER * 1.92;
      const baseWidth = FOCUS_WIDTH * 1.56;
      const fitH = (height * (narrow ? 0.78 : 0.92)) / spine;
      const fitW = (width * (narrow ? 0.96 : 0.9)) / baseWidth;
      scale = Math.max(narrow ? 0.95 : 1.2, Math.min(fitH, fitW));
      gap = Math.max(SPACING * scale, width / 220, 1);
      const ratio = previous || 1;
      scroll *= scale / ratio;
      target *= scale / ratio;
      camera.aspect = width / height;
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(height / (2 * camera.position.z)));
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      rebuild();
      layout();
    };

    const tick = (now: number) => {
      frame = 0;
      if (disposed || reduced) return;
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
      lastTime = now;
      if (!dragging) target += SPEED * scale * dt * (DIRECTION === "right" ? 1 : -1);
      const glide = SMOOTHING <= 0 ? 1 : 1 - Math.exp(-dt / (SMOOTHING / 1000));
      scroll += (target - scroll) * glide;
      wrapScroll();
      layout();
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (disposed || reduced || frame) return;
      lastTime = 0;
      frame = requestAnimationFrame(tick);
    };

    setStatus("Loading images…");
    sources.forEach((src, index) => {
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        side: THREE.FrontSide,
        toneMapped: false,
      });
      materials.push(material);
      aspects.push(0.8);
      const texture = loader.load(
        src,
        (map) => {
          if (disposed) {
            map.dispose();
            return;
          }
          map.colorSpace = THREE.SRGBColorSpace;
          map.minFilter = THREE.LinearMipmapLinearFilter;
          map.magFilter = THREE.LinearFilter;
          map.generateMipmaps = true;
          map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
          const image = map.image as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number };
          const w = image.naturalWidth || image.width || 1;
          const h = image.naturalHeight || image.height || 1;
          aspects[index] = w / h;
          material.map = map;
          material.opacity = 1;
          material.needsUpdate = true;
          textures.add(map);
          loaded += 1;
          setStatus("");
          layout();
        },
        undefined,
        () => {
          if (disposed) return;
          failed += 1;
          if (loaded === 0 && failed === sources.length) setStatus("Images could not load.");
        },
      );
      textures.add(texture);
    });

    const onPointerDown = (event: PointerEvent) => {
      if (pointerId !== null || event.button !== 0 || !event.isPrimary) return;
      pointerId = event.pointerId;
      lastX = event.clientX;
      dragging = true;
      target = scroll;
      el.setPointerCapture(event.pointerId);
      el.style.cursor = "grabbing";
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const rect = el.getBoundingClientRect();
      const ratio = rect.width ? width / rect.width : 1;
      target += (event.clientX - lastX) * ratio;
      lastX = event.clientX;
      if (reduced) {
        scroll = target;
        wrapScroll();
        layout();
      }
    };
    const endDrag = (event: PointerEvent) => {
      if (pointerId === null || (event.pointerId !== pointerId && event.type !== "lostpointercapture")) return;
      const id = pointerId;
      pointerId = null;
      dragging = false;
      el.style.cursor = "grab";
      if (el.hasPointerCapture(id)) el.releasePointerCapture(id);
    };
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (!horizontal && !event.shiftKey) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? width : 1;
      target -= (horizontal ? event.deltaX : event.deltaY) * unit;
      if (reduced) {
        scroll = target;
        wrapScroll();
        layout();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        target += gap * 5;
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        target -= gap * 5;
      } else return;
      if (reduced) {
        scroll = target;
        wrapScroll();
        layout();
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("lostpointercapture", endDrag);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("keydown", onKey);

    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    if (!reduced) start();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("lostpointercapture", endDrag);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("keydown", onKey);
      scrollRef.current = scroll;
      for (const texture of textures) texture.dispose();
      for (const material of materials) material.dispose();
      geometry.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [sourceKey, sources.length]);

  if (sources.length === 0) return null;

  return (
    <section ref={sectionRef} aria-label="Galeria" className={`gallery-zoom relative bg-black ${className}`}>
      <div className="gallery-zoom-view">
        <div
          ref={containerRef}
          role="region"
          aria-label="Infinite image carousel. Drag or use arrow keys to browse."
          tabIndex={0}
          className="absolute inset-0 cursor-grab touch-pan-y overflow-hidden select-none"
        >
          <div
            ref={statusRef}
            aria-live="polite"
            className="pointer-events-none absolute inset-0 z-[1] grid place-items-center px-6 text-center text-[13px] text-[#999]"
          />
        </div>
        <Link
          to="/galeria"
          className="absolute top-[max(5.75rem,calc(env(safe-area-inset-top)+4.5rem))] right-4 z-20 border border-white/40 bg-black/45 px-4 py-2 text-[12px] tracking-[0.16em] text-white uppercase no-underline backdrop-blur-md transition-colors hover:bg-white hover:text-black md:top-6 md:right-6"
        >
          Galeria
        </Link>
      </div>
    </section>
  );
}
