import { useEffect, useRef } from "react";

type RgbTints = { red: HTMLCanvasElement; green: HTMLCanvasElement; blue: HTMLCanvasElement };

type EyeProps = {
  logoSrc: string;
  logoBlur?: boolean;
  rotationSpeed?: number;
  glitchiness?: number;
  grainStrength?: number;
  asciiDensity?: string;
  maxAsciiCols?: number;
  maxAsciiRows?: number;
  eyeFollow?: number;
  className?: string;
};

const RGB = {
  red: "#ff2a2a",
  green: "#3dff6a",
  blue: "#2f5bff",
} as const;

function tintLogo(image: CanvasImageSource, color: string, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.drawImage(image, 0, 0, width, height);
  context.globalCompositeOperation = "source-in";
  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
  return canvas;
}

/** Push logo whites to pure #fff and boost the inner “7” strokes vs the triangle rim. */
function prepareMark(image: HTMLImageElement) {
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.drawImage(image, 0, 0);
  const img = context.getImageData(0, 0, w, h);
  const { data } = img;
  const cx = w * 0.5;
  const cy = h * 0.52;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0;
    if (a < 8) continue;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const lum = (r + g + b) / 3;
    if (lum < 40) continue;
    const x = (i / 4) % w;
    const y = Math.floor(i / 4 / w);
    // Distance from mark center — the “7” sits inside the triangle.
    const dx = (x - cx) / w;
    const dy = (y - cy) / h;
    const inside = Math.hypot(dx, dy) < 0.26;
    const punch = inside ? 1 : 0.88;
    const bright = Math.min(255, Math.round(255 * punch + (255 - lum) * (inside ? 0.55 : 0)));
    data[i] = bright;
    data[i + 1] = bright;
    data[i + 2] = bright;
    data[i + 3] = inside ? Math.min(255, Math.round(a * 1.15 + 18)) : a;
  }
  context.putImageData(img, 0, 0);
  return canvas;
}

const GLITCH_CHARS = ["█", "▓", "▒", "░", "▄", "▀", "■", "□"];

/** Glitching tech mark: logo at full eye size, no iris ring; grain/ascii/RGB stay. */
export function GlitchingTechEye({
  logoSrc,
  logoBlur = false,
  rotationSpeed = 1,
  glitchiness = 0.7,
  grainStrength = 0.5,
  asciiDensity = " .:-=+*#%@",
  maxAsciiCols = 150,
  maxAsciiRows = 100,
  eyeFollow = 0.9,
  className = "",
}: EyeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grainCanvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLCanvasElement | null>(null);
  const tintsRef = useRef<RgbTints | null>(null);
  const blurRef = useRef(logoBlur);
  blurRef.current = logoBlur;

  useEffect(() => {
    const image = new Image();
    image.src = logoSrc;
    image.onload = () => {
      const mark = prepareMark(image);
      logoRef.current = mark;
      tintsRef.current = {
        red: tintLogo(mark, RGB.red, mark.width, mark.height),
        green: tintLogo(mark, RGB.green, mark.width, mark.height),
        blue: tintLogo(mark, RGB.blue, mark.width, mark.height),
      };
    };
    return () => {
      logoRef.current = null;
      tintsRef.current = null;
    };
  }, [logoSrc]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const mouse = { x: 0, y: 0, inside: false };
    const section = el.closest("section") ?? el;
    const onMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
      const bounds = section.getBoundingClientRect();
      mouse.inside =
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom;
    };
    const onLeave = (event: MouseEvent) => {
      if (event.relatedTarget) return;
      mouse.inside = false;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave, { passive: true });

    const canvas = canvasRef.current;
    const grainCanvas = grainCanvasRef.current;
    if (!canvas || !grainCanvas) return;
    const ctx = canvas.getContext("2d");
    const gctx = grainCanvas.getContext("2d");
    if (!ctx || !gctx) return;

    const eyeOffset = { x: 0, y: 0 };
    let time = 0;
    let frame = 0;
    let rgbFrames = 0;
    const density = asciiDensity || " .:-=+*#%@";

    const render = () => {
      time += 0.016;
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const wCss = canvas.clientWidth || el.clientWidth;
      const hCss = canvas.clientHeight || el.clientHeight;
      const w = Math.floor(wCss * dpr);
      const h = Math.floor(hCss * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const gw = Math.max(2, Math.floor(w * 0.5));
      const gh = Math.max(2, Math.floor(h * 0.5));
      if (grainCanvas.width !== gw || grainCanvas.height !== gh) {
        grainCanvas.width = gw;
        grainCanvas.height = gh;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, wCss, hCss);

      const cx = wCss / 2;
      const cy = hCss / 2;
      // Logo fills the former iris diameter (no ring / no circular fill).
      const eyeR = Math.min(wCss, hCss) * 0.24;
      const logoSize = eyeR * 2;

      const rotation = time * rotationSpeed * Math.PI * 0.5;
      const shouldGlitch = Math.random() < 0.08 * glitchiness;
      const gOffset = shouldGlitch ? (Math.random() - 0.5) * 20 * glitchiness : 0;
      const gScale = shouldGlitch ? 1 + (Math.random() - 0.5) * 0.25 * glitchiness : 1;

      ctx.save();
      if (shouldGlitch) {
        ctx.translate(gOffset, gOffset * 0.8);
        ctx.scale(gScale, 1 / (gScale || 1));
      }

      const maxOffset = eyeR * 0.14 * eyeFollow;
      let tx = 0;
      let ty = 0;
      if (mouse.inside) {
        const dx = mouse.x - cx;
        const dy = mouse.y - cy;
        const len = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, len / (eyeR * 1.1));
        tx = (dx / len) * maxOffset * k;
        ty = (dy / len) * maxOffset * k;
      }
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      eyeOffset.x = lerp(eyeOffset.x, tx, 0.12 + 0.2 * eyeFollow);
      eyeOffset.y = lerp(eyeOffset.y, ty, 0.12 + 0.2 * eyeFollow);

      if (rgbFrames > 0) rgbFrames -= 1;
      else if (Math.random() < 0.012 * glitchiness) rgbFrames = 10 + Math.floor(Math.random() * 8);
      const rgbBurst = rgbFrames > 0;
      const split = Math.max(4, eyeR * 0.05);

      const logo = logoRef.current;
      const lx = cx + eyeOffset.x - logoSize / 2;
      const ly = cy + eyeOffset.y - logoSize / 2;

      // ASCII texture only on the mark silhouette (no circular orb).
      if (logo && logo.width > 0) {
        ctx.save();
        ctx.beginPath();
        // Approximate triangle clip around the mark.
        ctx.moveTo(cx + eyeOffset.x, ly + logoSize * 0.08);
        ctx.lineTo(lx + logoSize * 0.08, ly + logoSize * 0.92);
        ctx.lineTo(lx + logoSize * 0.92, ly + logoSize * 0.92);
        ctx.closePath();
        ctx.clip();
        ctx.font = `${Math.max(7, Math.floor(9 * dpr))}px "JetBrains Mono", ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const spacing = 8;
        const cols = Math.min(maxAsciiCols, Math.floor(logoSize / spacing) + 4);
        const rows = Math.min(maxAsciiRows, Math.floor(logoSize / spacing) + 4);
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const x = lx + (i + 0.5) * (logoSize / cols);
            const y = ly + (j + 0.5) * (logoSize / rows);
            if (Math.random() > 0.55) continue;
            const dx = x - (cx + eyeOffset.x);
            const dy = y - (cy + eyeOffset.y);
            const dist = Math.hypot(dx, dy);
            const z = Math.sqrt(Math.max(0, eyeR * eyeR - dx * dx - dy * dy));
            const rotZ = dx * Math.sin(rotation) + z * Math.cos(rotation);
            const bright = (rotZ + eyeR) / (eyeR * 2);
            let idx = Math.floor(bright * (density.length - 1));
            idx = Math.min(density.length - 1, Math.max(0, idx));
            let ch = density[idx] ?? " ";
            if (dist < eyeR * 0.55 && glitchiness > 0.8 && Math.random() < 0.3) {
              ch = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] ?? ch;
            }
            const alpha = Math.max(0.15, bright) * 0.4;
            if (rgbBurst) {
              ctx.fillStyle = `rgba(255,42,42,${alpha})`;
              ctx.fillText(ch, x - split, y + split * 0.25);
              ctx.fillStyle = `rgba(47,91,255,${alpha})`;
              ctx.fillText(ch, x + split, y - split * 0.15);
              ctx.fillStyle = `rgba(61,255,106,${alpha})`;
              ctx.fillText(ch, x + split * 0.2, y + split * 0.7);
            }
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.fillText(ch, x, y);
          }
        }
        ctx.restore();
      }

      if (logo && logo.width > 0) {
        const size = logoSize;
        ctx.save();
        if (blurRef.current) ctx.filter = "blur(18px)";
        if (rgbBurst && tintsRef.current) {
          const { red, green, blue } = tintsRef.current;
          ctx.drawImage(red, lx - split, ly + split * 0.25, size, size);
          ctx.drawImage(blue, lx + split, ly - split * 0.15, size, size);
          ctx.drawImage(green, lx + split * 0.2, ly + split * 0.7, size, size);
        }
        // Soft white bloom so the mark (especially the inner 7) reads brighter.
        ctx.shadowColor = "rgba(255,255,255,0.95)";
        ctx.shadowBlur = size * 0.1;
        ctx.drawImage(logo, lx, ly, size, size);
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.28;
        ctx.drawImage(logo, lx, ly, size, size);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
      }
      ctx.restore();

      // Grain only where the mark was drawn — no circular disc.
      gctx.clearRect(0, 0, gw, gh);
      const img = gctx.createImageData(gw, gh);
      const data = img.data;
      const amp = Math.floor(255 * (0.1 + grainStrength * 0.35));
      for (let p = 0; p < data.length; p += 4) {
        const n = (Math.random() - 0.5) * amp;
        const v = Math.max(0, Math.min(255, 128 + n));
        data[p] = v;
        data[p + 1] = v;
        data[p + 2] = v;
        data[p + 3] = Math.max(0, Math.min(255, Math.abs(n) * 3));
      }
      gctx.putImageData(img, 0, 0);
      if (glitchiness > 0.5) {
        gctx.globalCompositeOperation = "screen";
        for (let i = 0; i < 60; i++) {
          const x = Math.random() * gw;
          const y = Math.random() * gh;
          const r = Math.random() * 2 + 0.5;
          gctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.35 * glitchiness})`;
          gctx.beginPath();
          gctx.arc(x, y, r, 0, Math.PI * 2);
          gctx.fill();
        }
        gctx.globalCompositeOperation = "source-over";
      }
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.globalAlpha = 0.35 + grainStrength * 0.45;
      ctx.drawImage(grainCanvas, 0, 0, wCss, hCss);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.restore();
      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, [rotationSpeed, glitchiness, grainStrength, asciiDensity, maxAsciiCols, maxAsciiRows, eyeFollow]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        background: "transparent",
        position: "relative",
        overflow: "visible",
        filter: logoBlur ? "blur(18px)" : "none",
        transition: "filter 700ms ease-out",
      }}
    >
      <style>{"@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');"}</style>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      <canvas ref={grainCanvasRef} aria-hidden className="hidden" />
    </div>
  );
}
