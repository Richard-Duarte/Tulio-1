import { useEffect, useRef } from "react";

/** Sparse monochrome glyph field — atmosphere only, not a logo. */
export function CharacterBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const glyphs = ["·", "+", "·", "·", "+"];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const t = now * 0.001;
      const cols = Math.ceil(w / 20);
      const rows = Math.ceil(h / 22);
      ctx.font = '10px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textBaseline = "top";
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const wave = Math.sin(col * 0.18 + row * 0.07 + t * 0.8);
          const hole = Math.sin(col * 0.05 - row * 0.04 + t * 0.35);
          if (hole > 0.72) continue;
          const x = col * 20 + (reduced ? 0 : wave * 1.5);
          const y = row * 22;
          const alpha = 0.03 + (wave + 1) * 0.025;
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fillText(glyphs[(col + row) % glyphs.length]!, x, y);
        }
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}
