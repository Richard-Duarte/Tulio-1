import { useEffect, useRef } from "react";
import { signalIntroReady } from "@/lib/intro";
import { holdPageReveal, onPageLeave } from "@/lib/page-transition";

type TunnelItem = {
  id: string;
  kind: "image" | "video" | "audio";
  public_url: string | null;
  poster_url: string | null;
};

export function InfiniteTunnel({ items }: { items: TunnelItem[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = sectionRef.current;
    // Route transitions keep the curtain down until the first textured frame is on screen
    // (otherwise the page is revealed as an empty black hero with just the logo).
    const releaseHold = holdPageReveal();
    const ready = () => {
      signalIntroReady("scene");
      releaseHold();
    };
    if (!items.length) ready();
    if (!canvas || !container || !items.length) return releaseHold;
    const tunnelContainer = container;
    let disposed = false;
    let cleanup = () => {};
    // Phones / touch devices and data saver: photos only (the video slots are several 1080p
    // streams decoded and re-uploaded to the GPU every frame), lower pixel ratio, no MSAA.
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const saveData = connection?.saveData === true;
    const lite = saveData || window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
    const stills = items.filter((item) => item.kind !== "video");
    const source = lite && stills.length ? stills : items;

    void import("three").then((THREE) => {
      if (disposed) return;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020713);
      scene.fog = new THREE.FogExp2(0x020713, 0.036);
      const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 500);
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1.5 : 2));
      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
      const depth = 7;
      const count = 12;
      const segments: InstanceType<typeof THREE.Group>[] = [];
      const videos: HTMLVideoElement[] = [];
      // Tell the intro loader the scene is ready once most image textures are in (or 2.5s).
      const imageCount = source.slice(0, 18).filter((item) => item.kind !== "video").length;
      let loadedImages = 0;
      const sceneReadyTimer = window.setTimeout(ready, 2500);
      const onTextureLoaded = () => {
        render();
        loadedImages += 1;
        if (loadedImages >= Math.ceil(imageCount * 0.6)) ready();
      };
      const textures = source.slice(0, 18).map((item) => {
        if (item.kind === "video" && item.public_url) {
          const video = document.createElement("video");
          video.src = item.public_url;
          video.poster = item.poster_url ?? "";
          video.muted = true;
          video.loop = true;
          video.playsInline = true;
          video.preload = "metadata";
          video.crossOrigin = "anonymous";
          void video.play().catch(() => undefined);
          videos.push(video);
          const texture = new THREE.VideoTexture(video);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          return texture;
        }
        const texture = new THREE.TextureLoader().load(item.public_url ?? item.poster_url ?? "", onTextureLoaded, undefined, onTextureLoaded);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = maxAnisotropy;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        return texture;
      });
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x3269aa, transparent: true, opacity: 0.32 });

      function addImage(group: InstanceType<typeof THREE.Group>, index: number, side: number) {
        const texture = textures[index % textures.length];
        if (!texture) return;
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 3.5), material);
        const row = index % 3;
        if (side === 0) { mesh.position.set(-9.7, -4 + row * 4, -depth / 2); mesh.rotation.y = Math.PI / 2; }
        if (side === 1) { mesh.position.set(9.7, -4 + row * 4, -depth / 2); mesh.rotation.y = -Math.PI / 2; }
        if (side === 2) { mesh.position.set(-5 + row * 5, -7, -depth / 2); mesh.rotation.x = -Math.PI / 2; }
        group.add(mesh);
      }

      function makeSegment(index: number) {
        const group = new THREE.Group();
        group.position.z = -index * depth;
        const points: number[] = [];
        for (let x = -10; x <= 10; x += 4) points.push(x, -7, 0, x, -7, -depth, x, 7, 0, x, 7, -depth);
        for (let y = -3.5; y <= 3.5; y += 3.5) points.push(-10, y, 0, -10, y, -depth, 10, y, 0, 10, y, -depth);
        points.push(-10,-7,0,10,-7,0,-10,7,0,10,7,0,-10,-7,0,-10,7,0,10,-7,0,10,7,0);
        group.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(points, 3)), lineMaterial));
        addImage(group, index * 2, index % 3);
        addImage(group, index * 2 + 1, (index + 1) % 3);
        return group;
      }

      for (let index = 0; index < count; index += 1) {
        const segment = makeSegment(index);
        segments.push(segment);
        scene.add(segment);
      }

      let visible = true;
      let frame = 0;
      let current = 0;
      let scrollOffset = 0;
      let autoOffset = 0;
      let lastFrameTime = 0;
      let lastRenderTime = 0;
      function resize() {
        const width = tunnelContainer.clientWidth;
        const height = tunnelContainer.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        render();
      }
      function render() { if (!disposed && visible) renderer.render(scene, camera); }
      function tick(time: number) {
        if (!visible || disposed) {
          frame = 0;
          lastFrameTime = 0;
          return;
        }
        const elapsed = lastFrameTime ? Math.min(time - lastFrameTime, 50) : 0;
        lastFrameTime = time;
        autoOffset += elapsed * 0.0022;
        const target = autoOffset + scrollOffset;
        current += (target - current) * 0.1;
        camera.position.z = -current;
        const tunnelLength = count * depth;
        for (const segment of segments) {
          if (segment.position.z > camera.position.z + depth) segment.position.z -= tunnelLength;
          if (segment.position.z < camera.position.z - tunnelLength) segment.position.z += tunnelLength;
        }
        if (time - lastRenderTime >= 30) {
          render();
          lastRenderTime = time;
        }
        frame = requestAnimationFrame(tick);
      }
      function onScroll() {
        scrollOffset = scrollY * 0.04;
      }
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? false;
        if (visible && !frame) {
          lastFrameTime = 0;
          frame = requestAnimationFrame(tick);
        } else if (!visible && frame) {
          cancelAnimationFrame(frame);
          frame = 0;
          for (const video of videos) video.pause();
        }
        if (visible) for (const video of videos) void video.play().catch(() => undefined);
      });
      observer.observe(tunnelContainer);
      // Navigating away: the curtain is coming down, stop drawing and decoding right away.
      const stopLeave = onPageLeave(() => {
        observer.disconnect();
        visible = false;
        cancelAnimationFrame(frame);
        frame = 0;
        for (const video of videos) video.pause();
      });
      addEventListener("resize", resize, { passive: true });
      addEventListener("scroll", onScroll, { passive: true });
      resize();
      onScroll();
      frame = requestAnimationFrame(tick);
      if (!imageCount) ready();
      cleanup = () => {
        window.clearTimeout(sceneReadyTimer);
        stopLeave();
        observer.disconnect();
        removeEventListener("resize", resize);
        removeEventListener("scroll", onScroll);
        cancelAnimationFrame(frame);
        for (const video of videos) {
          video.pause();
          video.removeAttribute("src");
          video.load();
        }
        for (const texture of textures) texture.dispose();
        lineMaterial.dispose();
        renderer.dispose();
      };
    });
    return () => { disposed = true; releaseHold(); cleanup(); };
  }, [items]);

  return <div ref={sectionRef} className="absolute inset-0" aria-hidden="true"><canvas ref={canvasRef} className="size-full" /></div>;
}