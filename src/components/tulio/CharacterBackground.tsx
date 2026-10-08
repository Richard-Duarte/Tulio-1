import { useEffect, useRef } from "react";

type Glyph = { x: number; y: number; z: number; char: "7" | "▲"; speed: number };

export function CharacterBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let glyphs: Glyph[] = [];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.floor((canvas.clientWidth * canvas.clientHeight) / 9000);
      glyphs = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.clientWidth,
        y: Math.random() * canvas.clientHeight,
        z: Math.random(),
        char: Math.random() > 0.45 ? "7" : "▲",
        speed: 0.25 + Math.random() * 0.9,
      }));
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.font = "11px var(--font-mono, monospace)";
      for (const g of glyphs) {
        const alpha = 0.08 + g.z * 0.22;
        const cyan = g.char === "7";
        ctx.fillStyle = cyan
          ? `rgba(0, 255, 220, ${alpha})`
          : `rgba(255, 0, 140, ${alpha * 0.85})`;
        ctx.fillText(g.char, g.x, g.y);
        if (!reduced) {
          g.y += g.speed * (0.6 + g.z);
          if (g.y > h + 12) {
            g.y = -12;
            g.x = Math.random() * w;
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
      aria-hidden
    />
  );
}
