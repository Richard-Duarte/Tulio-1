import { useEffect, useRef } from "react";
import { signalIntroReady } from "@/lib/intro";

type Cell = { ox: number; oy: number; a: number };
type BgDot = { x: number; y: number; r: number; rgb: string };
type TrailPoint = { x: number; y: number; t: number };
type Band = { y: number; h: number; dx: number };

const SYMBOLS = ["7", "▲"] as const;
const WHITE = "245, 245, 247";
const RED = "255, 42, 42";
const GREEN = "42, 255, 106";
const BLUE = "42, 123, 255";

const IDLE_STRENGTH = 3.2;
const IDLE_SPEED = 1;
const INFLUENCE_RADIUS = 120;
const TRAIL_LIFE = 1.5;
const SPRING_ATTRACTION = 0.1;
const SPRING_DAMPING = 0.86;
const BRIGHTNESS = 0.6;
const GLOW = 1.1;
const INACTIVITY_FADE = 1.2;
const SYMBOL_MULT = 1.35;
const FIELD_RADIUS = 90;

function glyphFor(ox: number, oy: number, phase: number) {
  const hash = (Math.imul(ox | 0, 73856093) ^ Math.imul(oy | 0, 19349663) ^ phase) >>> 0;
  return SYMBOLS[hash % SYMBOLS.length]!;
}

function rgba(rgb: string, alpha: number) {
  return `rgba(${rgb}, ${alpha})`;
}

/**
 * Particle mark: ▲ / upside-down 7 / ▼.
 * Motion matches the Framer Logo Particle Field: sampled grid, idle sine drift,
 * spring cursor, liquid trail, attraction into the pointer.
 */
export function LogoParticleField() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cells: Cell[] = [];
    let bg: BgDot[] = [];
    let raf = 0;
    let dpr = 1;
    let w = 1;
    let h = 1;
    let spacing = 5;
    let readySent = false;
    const time = { value: 0, last: 0 };
    const pointer = { x: 0, y: 0, px: 0, py: 0, t: 0, vx: 0, vy: 0, speed: 0, inside: false };
    const follower = { x: w / 2, y: h / 2, vx: 0, vy: 0, influence: 0 };
    const trail: TrailPoint[] = [];
    let lastMove = 0;
    let glitchUntil = 0;
    let nextGlitch = 700;
    let bands: Band[] = [];

    const armGlitch = (now: number) => {
      if (reduced || now < glitchUntil) return;
      glitchUntil = now + 150;
      nextGlitch = glitchUntil + 1600 + Math.random() * 900;
      bands = [0, 1, 2].map((i) => ({
        y: (h * (0.18 + i * 0.22) + Math.random() * h * 0.12) % h,
        h: 12 + Math.random() * 34,
        dx: (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 26),
      }));
    };

    const sliceShift = (y: number) => {
      for (const band of bands) {
        if (y >= band.y && y < band.y + band.h) return band.dx;
      }
      return 0;
    };

    const sample = () => {
      const off = document.createElement("canvas");
      off.width = Math.floor(w);
      off.height = Math.floor(h);
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      octx.clearRect(0, 0, off.width, off.height);
      octx.fillStyle = "#fff";
      const size = Math.min(w * 0.34, h * 0.2, 260);
      const triW = size * 1.05;
      const triH = triW * 0.78;
      const sevenSize = size * 0.92;
      const gap = size * 0.12;
      const total = triH + gap + sevenSize + gap + triH;
      const top = (h - total) / 2;
      const cx = w / 2;

      const triangle = (cy: number, up: boolean) => {
        octx.beginPath();
        if (up) {
          octx.moveTo(cx, cy - triH / 2);
          octx.lineTo(cx + triW / 2, cy + triH / 2);
          octx.lineTo(cx - triW / 2, cy + triH / 2);
        } else {
          octx.moveTo(cx, cy + triH / 2);
          octx.lineTo(cx - triW / 2, cy - triH / 2);
          octx.lineTo(cx + triW / 2, cy - triH / 2);
        }
        octx.closePath();
        octx.fill();
      };

      triangle(top + triH / 2, true);
      octx.save();
      octx.translate(cx, top + triH + gap + sevenSize / 2);
      octx.rotate(Math.PI);
      octx.font = `600 ${sevenSize}px "Tektur", sans-serif`;
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillText("7", 0, 0);
      octx.restore();
      triangle(top + triH + gap + sevenSize + gap + triH / 2, false);

      const data = octx.getImageData(0, 0, off.width, off.height).data;
      spacing = w < 720 ? 7 : 5;
      const next: Cell[] = [];
      for (let y = 0; y < off.height; y += spacing) {
        for (let x = 0; x < off.width; x += spacing) {
          const a = data[(y * off.width + x) * 4 + 3] ?? 0;
          if (a < 40) continue;
          next.push({ ox: x, oy: y, a: a / 255 });
        }
      }
      cells = next.length > 14000 ? next.slice(0, 14000) : next;

      const dots: BgDot[] = [];
      const step = 22;
      for (let yy = 12; yy < h; yy += step) {
        for (let xx = 12; xx < w; xx += step) {
          const tone = (xx + yy) % 11;
          dots.push({
            x: xx,
            y: yy,
            r: 0.7 + ((xx + yy) % 5) * 0.12,
            rgb: tone === 0 ? RED : tone === 4 ? BLUE : tone === 8 ? GREEN : WHITE,
          });
        }
      }
      bg = dots;
      if (!readySent && cells.length > 0) {
        readySent = true;
        signalIntroReady("scene");
      }
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      if (!pointer.inside) {
        follower.x = w / 2;
        follower.y = h / 2;
        pointer.x = w / 2;
        pointer.y = h / 2;
      }
      sample();
    };

    const onMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = performance.now();
      const dt = Math.max(0.001, (now - (pointer.t || now)) / 1000);
      pointer.vx = (x - pointer.px) / dt;
      pointer.vy = (y - pointer.py) / dt;
      pointer.speed = Math.hypot(pointer.vx, pointer.vy);
      pointer.px = x;
      pointer.py = y;
      pointer.x = x;
      pointer.y = y;
      pointer.t = now;
      pointer.inside = true;
      lastMove = now / 1000;
      trail.push({ x, y, t: now / 1000 });
      if (trail.length > 80) trail.shift();
      if (pointer.speed > 1400) armGlitch(now);
    };
    const onLeave = () => {
      pointer.inside = false;
    };

    const draw = (now: number) => {
      const dt = Math.min(0.033, Math.max(0.001, (now - (time.last || now)) / 1000));
      time.last = now;
      time.value += reduced ? 0 : dt;
      if (!reduced && now > nextGlitch) armGlitch(now);
      const glitching = !reduced && now < glitchUntil;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const attraction = SPRING_ATTRACTION;
      follower.vx += (pointer.x - follower.x) * attraction;
      follower.vy += (pointer.y - follower.y) * attraction;
      follower.vx *= SPRING_DAMPING;
      follower.vy *= SPRING_DAMPING;
      follower.x += follower.vx;
      follower.y += follower.vy;
      const inactive = now / 1000 - lastMove;
      const activityTarget = pointer.inside || inactive < INACTIVITY_FADE ? 1 : 0;
      follower.influence += (activityTarget - follower.influence) * 0.04;
      const influence = reduced ? 0 : follower.influence;
      const t = time.value * IDLE_SPEED;
      const stretch = Math.min(1.5, pointer.speed / 800);
      const len = Math.hypot(pointer.vx || 1, pointer.vy || 0) || 1;
      const ndx = (pointer.vx || 1) / len;
      const ndy = (pointer.vy || 0) / len;
      const fieldReach = Math.max(INFLUENCE_RADIUS, FIELD_RADIUS);
      const phase = Math.floor(t * 0.22);

      for (const dot of bg) {
        const bdx = follower.x - dot.x;
        const bdy = follower.y - dot.y;
        const bDist = Math.hypot(bdx, bdy) || 1;
        const bn = Math.max(0, 1 - bDist / (fieldReach * 1.15)) * influence;
        const bx = dot.x + (bdx / bDist) * bn * (1.8 + BRIGHTNESS * 2.4);
        const by = dot.y + (bdy / bDist) * bn * (1.2 + BRIGHTNESS * 1.6);
        ctx.fillStyle = rgba(dot.rgb, 0.12);
        ctx.beginPath();
        ctx.arc(bx, by, dot.r * (1 + bn * 1.1), 0, Math.PI * 2);
        ctx.fill();
      }

      if (influence > 0.01) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(follower.x, follower.y, FIELD_RADIUS, 0, Math.PI * 2);
        ctx.clip();
        const field = ctx.createRadialGradient(
          follower.x,
          follower.y,
          FIELD_RADIUS * 0.2,
          follower.x,
          follower.y,
          FIELD_RADIUS,
        );
        field.addColorStop(0, rgba(WHITE, 0.08 * influence));
        field.addColorStop(0.55, rgba(WHITE, 0.03 * influence));
        field.addColorStop(1, rgba(BLUE, 0.02 * influence));
        ctx.fillStyle = field;
        ctx.fillRect(follower.x - FIELD_RADIUS, follower.y - FIELD_RADIUS, FIELD_RADIUS * 2, FIELD_RADIUS * 2);
        ctx.restore();
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const flickerDim = glitching && Math.floor(now / 42) % 3 === 0;
      for (let i = 0; i < cells.length; i++) {
        const p = cells[i]!;
        const flow1 = Math.sin(p.ox * 0.023 - p.oy * 0.011 + t * 1.35);
        const flow2 = Math.sin(p.ox * -0.014 + p.oy * 0.027 - t * 1.05);
        const flow3 = Math.cos(p.ox * 0.008 + p.oy * 0.02 + t * 1.7);
        const flowMix = flow1 * 0.5 + flow2 * 0.33 + flow3 * 0.27;
        let x = p.ox + (reduced ? 0 : IDLE_STRENGTH * flowMix);
        let y = p.oy + (reduced ? 0 : IDLE_STRENGTH * (flow1 * -0.24 + flow2 * 0.58 + flow3 * 0.3));
        const dx = follower.x - x;
        const dy = follower.y - y;
        const dist = Math.hypot(dx, dy) || 1;
        const n = Math.max(0, 1 - dist / fieldReach) * influence;
        const coreN = Math.max(0, 1 - dist / Math.max(36, fieldReach * 0.5)) * influence;
        if (n > 0) {
          const pull = (n * 8.8 + coreN * 5.2) * (1 + BRIGHTNESS * 0.8);
          x += (dx / dist) * pull;
          y += (dy / dist) * pull;
        }
        if (glitching) x += sliceShift(p.oy);
        const glyph = glyphFor(p.ox, p.oy, phase);
        const fontSize = Math.max(
          6,
          (spacing * SYMBOL_MULT + n * spacing * 0.8 + coreN * spacing * 0.45) * (0.85 + p.a * 0.35),
        );
        ctx.font = `${fontSize}px "Fragment Mono", ui-monospace, monospace`;
        const alpha = Math.min(1, p.a * (0.8 + n * 0.55 + coreN * 0.2)) * (flickerDim ? 0.45 : 1);
        const rgb = i % 17 === 0 ? RED : i % 13 === 0 ? BLUE : i % 11 === 0 ? GREEN : WHITE;
        if (glitching) {
          ctx.fillStyle = rgba(i % 2 === 0 ? RED : BLUE, alpha * 0.7);
          ctx.fillText(glyph, x + (i % 2 === 0 ? -5 : 5), y);
        }
        ctx.fillStyle = rgba(rgb, alpha);
        ctx.fillText(glyph, x, y);
      }

      const fieldScale = Math.max(1, INFLUENCE_RADIUS / 120);
      if (influence > 0.01) {
        const followerSize = (14 + INFLUENCE_RADIUS * 0.2) * influence;
        const angle = Math.atan2(ndy, ndx);
        const count = Math.min(40, Math.floor(16 + GLOW * 8 + fieldScale * 8));
        for (let i = 0; i < count; i++) {
          const pr = (i / Math.max(1, count - 1)) * Math.PI * 2;
          const ring = 0.25 + ((i * 17) % 100) / 100;
          const ex = Math.cos(pr) * followerSize * (0.35 + ring) * (1 + stretch * 0.8);
          const ey = Math.sin(pr) * followerSize * (0.35 + ring) * (1 - stretch * 0.35);
          const rx = ex * Math.cos(angle) - ey * Math.sin(angle);
          const ry = ex * Math.sin(angle) + ey * Math.cos(angle);
          const alpha = (0.05 + 0.18 * (1 - ring)) * influence;
          ctx.fillStyle = rgba(i % 3 === 0 ? RED : i % 3 === 1 ? BLUE : WHITE, alpha);
          ctx.beginPath();
          ctx.arc(
            follower.x + rx,
            follower.y + ry,
            1 + (3.8 * (1 - ring) + GLOW * 0.5) * influence,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }

      const trailNow = now / 1000;
      for (let i = trail.length - 1; i >= 0; i--) {
        const tp = trail[i]!;
        const age = trailNow - tp.t;
        if (age > TRAIL_LIFE) {
          trail.splice(i, 1);
          continue;
        }
        const k = Math.max(0, 1 - age / TRAIL_LIFE) * influence;
        if (k <= 0.001) continue;
        const elongate = 1 + stretch * k * 1.8;
        const base = (2 + 11 * k * fieldScale) * (1 + GLOW * 0.16);
        const angle = Math.atan2(ndy, ndx);
        ctx.save();
        ctx.translate(tp.x, tp.y);
        ctx.rotate(angle);
        ctx.fillStyle = rgba(i % 3 === 0 ? RED : i % 3 === 1 ? BLUE : GREEN, 0.35 * k);
        ctx.beginPath();
        ctx.ellipse(0, 0, base * elongate, base * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    const start = () => {
      resize();
      cancelAnimationFrame(raf);
      time.last = performance.now();
      raf = requestAnimationFrame(draw);
    };
    void document.fonts?.ready.then(() => {
      sample();
    });
    start();

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw(performance.now());
    });
    ro.observe(wrap);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 z-[1] cursor-none">
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden />
    </div>
  );
}
