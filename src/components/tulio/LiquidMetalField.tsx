import { useEffect, useRef } from "react";

/**
 * Flowing black-chrome field. Specular highlight follows the pointer;
 * blob rims pick up red, blue and green reflections.
 */
export function LiquidMetalField() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let dpr = 1;
    let w = 1;
    let h = 1;
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    };

    const onMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      pointer.tx = (e.clientX - rect.left) / rect.width;
      pointer.ty = (e.clientY - rect.top) / rect.height;
    };

    const draw = (now: number) => {
      const t = now * 0.001;
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const blobs = [
        {
          x: w * (0.5 + Math.sin(t * 0.35) * 0.16),
          y: h * (0.46 + Math.cos(t * 0.28) * 0.1),
          r: Math.min(w, h) * 0.34,
        },
        {
          x: w * pointer.x,
          y: h * pointer.y,
          r: Math.min(w, h) * 0.2,
        },
        {
          x: w * (0.28 + Math.cos(t * 0.22) * 0.1),
          y: h * (0.62 + Math.sin(t * 0.4) * 0.08),
          r: Math.min(w, h) * 0.18,
        },
        {
          x: w * (0.74 + Math.sin(t * 0.18) * 0.08),
          y: h * (0.3 + Math.cos(t * 0.31) * 0.07),
          r: Math.min(w, h) * 0.16,
        },
      ];

      ctx.globalCompositeOperation = "lighter";
      for (const blob of blobs) {
        const hx = blob.x - blob.r * 0.28;
        const hy = blob.y - blob.r * 0.32;
        const g = ctx.createRadialGradient(hx, hy, blob.r * 0.04, blob.x, blob.y, blob.r);
        g.addColorStop(0, "rgba(255,255,255,0.42)");
        g.addColorStop(0.18, "rgba(210,210,210,0.16)");
        g.addColorStop(0.42, "rgba(90,90,90,0.07)");
        g.addColorStop(0.72, "rgba(20,20,20,0.03)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "screen";
      const rims = [
        { rgb: "255,42,42", ox: -10, oy: 0 },
        { rgb: "42,123,255", ox: 10, oy: 0 },
        { rgb: "42,255,106", ox: 0, oy: 8 },
      ];
      for (const rim of rims) {
        const blob = blobs[0]!;
        const g = ctx.createRadialGradient(
          blob.x + rim.ox,
          blob.y + rim.oy,
          blob.r * 0.62,
          blob.x,
          blob.y,
          blob.r * 1.02,
        );
        g.addColorStop(0, `rgba(${rim.rgb},0)`);
        g.addColorStop(0.78, `rgba(${rim.rgb},0.12)`);
        g.addColorStop(1, `rgba(${rim.rgb},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.r * 1.02, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    wrap.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden />
    </div>
  );
}
