import { useEffect, useRef } from "react";

type Particle = {
  bx: number;
  by: number;
  x: number;
  y: number;
  char: "7" | "▲";
  glitch: number;
};

const LOGO_SRC = "/brand/tulio-logo.png";

export function LogoParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let particles: Particle[] = [];
    let mouse = { x: -9999, y: -9999 };
    const img = new Image();
    img.src = LOGO_SRC;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const build = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const off = document.createElement("canvas");
      const ow = 420;
      const oh = 120;
      off.width = ow;
      off.height = oh;
      const octx = off.getContext("2d");
      if (!octx) return;
      octx.fillStyle = "#000";
      octx.fillRect(0, 0, ow, oh);
      const scale = Math.min(ow / img.width, oh / img.height) * 0.92;
      const dw = img.width * scale;
      const dh = img.height * scale;
      octx.drawImage(img, (ow - dw) / 2, (oh - dh) / 2, dw, dh);
      const { data } = octx.getImageData(0, 0, ow, oh);
      particles = [];
      const step = 5;
      for (let y = 0; y < oh; y += step) {
        for (let x = 0; x < ow; x += step) {
          const i = (y * ow + x) * 4;
          if (data[i]! < 40) continue;
          const px = w / 2 - ow / 2 + x;
          const py = h / 2 - oh / 2 + y;
          particles.push({
            bx: px,
            by: py,
            x: px,
            y: py,
            char: (x + y) % 7 === 0 ? "▲" : "7",
            glitch: Math.random(),
          });
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.font = "10px var(--font-mono, monospace)";
      const t = performance.now() * 0.001;
      for (const p of particles) {
        let dx = 0;
        let dy = 0;
        if (!reduced) {
          const distX = p.x - mouse.x;
          const distY = p.y - mouse.y;
          const dist = Math.hypot(distX, distY);
          if (dist < 90) {
            const force = (90 - dist) / 90;
            dx = (distX / (dist || 1)) * force * 14;
            dy = (distY / (dist || 1)) * force * 14;
          }
          p.x += (p.bx - p.x) * 0.06 + dx * 0.2;
          p.y += (p.by - p.y) * 0.06 + dy * 0.2;
          if (Math.sin(t * 3 + p.glitch * 20) > 0.97) {
            p.x += (Math.random() - 0.5) * 3;
            p.y += (Math.random() - 0.5) * 2;
          }
        } else {
          p.x = p.bx;
          p.y = p.by;
        }
        const isTri = p.char === "▲";
        ctx.fillStyle = isTri ? "rgba(255, 0, 150, 0.95)" : "rgba(0, 255, 230, 0.92)";
        if (!reduced && Math.sin(t * 5 + p.glitch * 10) > 0.985) {
          ctx.fillStyle = isTri ? "rgba(0, 255, 230, 0.9)" : "rgba(255, 0, 150, 0.9)";
          ctx.fillText(p.char, p.x + 1, p.y);
        }
        ctx.fillText(p.char, p.x, p.y);
      }
      raf = requestAnimationFrame(draw);
    };

    img.onload = () => {
      build();
      draw();
    };
    if (img.complete) img.onload?.(new Event("load"));

    window.addEventListener("resize", build);
    canvas.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", build);
      canvas.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
