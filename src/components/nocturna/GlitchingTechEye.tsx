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

function tintLogo(image: HTMLImageElement, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.drawImage(image, 0, 0);
  context.globalCompositeOperation = "source-in";
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

const GLITCH_CHARS = ["█", "▓", "▒", "░", "▄", "▀", "■", "□"];

/** Framer "The Glitching Tech Eye", with the logo drawn in place of the iris circle. */
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
  const logoRef = useRef<HTMLImageElement | null>(null);
  const tintsRef = useRef<RgbTints | null>(null);
  const blurRef = useRef(logoBlur);
  blurRef.current = logoBlur;

  useEffect(() => {
    const image = new Image();
    image.src = logoSrc;
    image.onload = () => {
      logoRef.current = image;
      tintsRef.current = {
        red: tintLogo(image, RGB.red),
        green: tintLogo(image, RGB.green),
        blue: tintLogo(image, RGB.blue),
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
      const radius = Math.min(wCss, hCss) * 0.2;

      const rotation = time * rotationSpeed * Math.PI * 0.5;
      const shouldGlitch = Math.random() < 0.08 * glitchiness;
      const gOffset = shouldGlitch ? (Math.random() - 0.5) * 20 * glitchiness : 0;
      const gScale = shouldGlitch ? 1 + (Math.random() - 0.5) * 0.25 * glitchiness : 1;

      ctx.save();
      if (shouldGlitch) {
        ctx.translate(gOffset, gOffset * 0.8);
        ctx.scale(gScale, 1 / (gScale || 1));
      }

      const orbGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.5);
      orbGrad.addColorStop(0, "rgba(255,255,255,0.42)");
      orbGrad.addColorStop(0.2, "rgba(210,210,210,0.28)");
      orbGrad.addColorStop(0.5, "rgba(90,90,90,0.16)");
      orbGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = orbGrad;
      ctx.fillRect(0, 0, wCss, hCss);

      const maxOffset = radius * 0.18 * eyeFollow;
      let tx = 0;
      let ty = 0;
      if (mouse.inside) {
        const dx = mouse.x - cx;
        const dy = mouse.y - cy;
        const len = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, len / (radius * 1.2));
        tx = (dx / len) * maxOffset * k;
        ty = (dy / len) * maxOffset * k;
      }
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      eyeOffset.x = lerp(eyeOffset.x, tx, 0.12 + 0.2 * eyeFollow);
      eyeOffset.y = lerp(eyeOffset.y, ty, 0.12 + 0.2 * eyeFollow);

      if (rgbFrames > 0) rgbFrames -= 1;
      else if (Math.random() < 0.012 * glitchiness) rgbFrames = 10 + Math.floor(Math.random() * 8);
      const rgbBurst = rgbFrames > 0;
      const split = Math.max(4, radius * 0.05);

      ctx.lineWidth = 2;
      if (rgbBurst) {
        const fringes: Array<[number, number, string]> = [
          [-split, split * 0.25, RGB.red],
          [split, -split * 0.15, RGB.blue],
          [split * 0.2, split * 0.7, RGB.green],
        ];
        for (const [ox, oy, color] of fringes) {
          ctx.strokeStyle = color;
          ctx.beginPath();
          ctx.arc(cx + ox, cy + oy, radius * 1.2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.strokeStyle = "rgba(255,255,255,0.72)";
      if (shouldGlitch) {
        const segments = 8;
        for (let i = 0; i < segments; i++) {
          const a0 = (i / segments) * Math.PI * 2;
          const a1 = ((i + 1) / segments) * Math.PI * 2;
          const rr = radius * 1.2 + (Math.random() - 0.5) * 10 * glitchiness;
          ctx.beginPath();
          ctx.arc(cx, cy, rr, a0, a1);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      ctx.font = `${Math.max(8, Math.floor(10 * dpr))}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const spacing = 9;
      const cols = Math.min(maxAsciiCols, Math.floor(wCss / spacing));
      const rows = Math.min(maxAsciiRows, Math.floor(hCss / spacing));
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = (i - cols / 2) * spacing + cx;
          const y = (j - rows / 2) * spacing + cy;
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.hypot(dx, dy);
          if (dist < radius && Math.random() > 0.4) {
            const z = Math.sqrt(Math.max(0, radius * radius - dx * dx - dy * dy));
            const rotZ = dx * Math.sin(rotation) + z * Math.cos(rotation);
            const bright = (rotZ + radius) / (radius * 2);
            if (rotZ > -radius * 0.3) {
              let idx = Math.floor(bright * (density.length - 1));
              idx = Math.min(density.length - 1, Math.max(0, idx));
              let ch = density[idx] ?? " ";
              if (dist < radius * 0.8 && glitchiness > 0.8 && Math.random() < 0.3) {
                ch = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] ?? ch;
              }
              const alpha = Math.max(0.2, bright);
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
        }
      }

      const logo = logoRef.current;
      if (logo && logo.complete && logo.naturalWidth > 0) {
        const size = radius * 0.92;
        const lx = cx + eyeOffset.x - size / 2;
        const ly = cy + eyeOffset.y - size / 2;
        ctx.save();
        if (blurRef.current) ctx.filter = "blur(18px)";
        if (rgbBurst && tintsRef.current) {
          const { red, green, blue } = tintsRef.current;
          ctx.drawImage(red, lx - split, ly + split * 0.25, size, size);
          ctx.drawImage(blue, lx + split, ly - split * 0.15, size, size);
          ctx.drawImage(green, lx + split * 0.2, ly + split * 0.7, size, size);
        }
        ctx.drawImage(logo, lx, ly, size, size);
        ctx.restore();
      }

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
        for (let i = 0; i < 100; i++) {
          const x = Math.random() * gw;
          const y = Math.random() * gh;
          const r = Math.random() * 2 + 0.5;
          gctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.4 * glitchiness})`;
          gctx.beginPath();
          gctx.arc(x, y, r, 0, Math.PI * 2);
          gctx.fill();
        }
        gctx.globalCompositeOperation = "source-over";
      }
      ctx.globalAlpha = 0.4 + grainStrength * 0.6;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(grainCanvas, 0, 0, wCss, hCss);
      ctx.globalAlpha = 1;
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
        overflow: "hidden",
        filter: logoBlur ? "blur(18px)" : "none",
        transition: "filter 700ms ease-out",
      }}
    >
      <style>{"@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');"}</style>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <canvas
        ref={grainCanvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "overlay" }}
      />
    </div>
  );
}
