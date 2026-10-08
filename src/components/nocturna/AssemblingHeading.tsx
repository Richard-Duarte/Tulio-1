import { useInView, useReducedMotion } from "motion/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const GLYPHS = ["▲", "7", "▼", "7", "▲", "▵", "7", "◢"] as const;

function pickGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;
}

type Seed = { x: number; y: number; g: string; rot: number };

function buildSeeds(count: number): Seed[] {
  return Array.from({ length: count }, (_, i) => ({
    x: 4 + ((i * 37) % 92),
    y: 8 + ((i * 53) % 84),
    g: GLYPHS[i % GLYPHS.length]!,
    rot: (i % 5) * 36 - 72,
  }));
}

/**
 * Title resolves from a field of ▲ / 7 with glitch slices — like an algorithm locking in.
 */
export function AssemblingHeading({
  as: Tag = "h2",
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const text = typeof children === "string" ? children : null;
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const reduced = useReducedMotion();
  const [locked, setLocked] = useState(0);
  const [noise, setNoise] = useState<string[]>([]);
  const [glitch, setGlitch] = useState(false);
  const seeds = useMemo(() => buildSeeds(text ? Math.min(32, text.length + 18) : 24), [text]);

  useEffect(() => {
    if (!text) return;
    setNoise(text.split("").map(() => pickGlyph()));
    if (reduced) {
      setLocked(text.length);
      return;
    }
    if (!inView) return;
    setLocked(0);
    let i = 0;
    const lockTimer = window.setInterval(() => {
      i += 1;
      setGlitch(true);
      window.setTimeout(() => setGlitch(false), 70);
      setLocked(i);
      if (i >= text.length) window.clearInterval(lockTimer);
    }, 58);
    const scrambleTimer = window.setInterval(() => {
      setNoise((prev) =>
        prev.map((g, idx) => (idx >= i ? pickGlyph() : g)),
      );
    }, 65);
    return () => {
      window.clearInterval(lockTimer);
      window.clearInterval(scrambleTimer);
    };
  }, [inView, reduced, text]);

  if (!text) {
    return <Tag className={cn("nc-display", className)}>{children}</Tag>;
  }

  const progress = text.length ? locked / text.length : 1;

  return (
    <Tag
      ref={ref as never}
      className={cn("nc-display nc-assemble", glitch && "nc-assemble-glitch", className)}
    >
      <span className="nc-assemble-field" aria-hidden>
        {seeds.map((s, i) => (
          <span
            key={i}
            className="nc-assemble-seed"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              transform: `rotate(${s.rot}deg)`,
              opacity: Math.max(0, 1 - progress * 1.15 - i * 0.015),
            }}
          >
            {s.g}
          </span>
        ))}
      </span>
      <span className="nc-assemble-slices" aria-hidden>
        <span className="nc-assemble-slice nc-assemble-slice-a" />
        <span className="nc-assemble-slice nc-assemble-slice-b" />
      </span>
      <span className="nc-assemble-line">
        {text.split("").map((ch, i) => {
          const done = i < locked;
          return (
            <span
              key={`${i}-${ch}`}
              className={cn("nc-assemble-char", done && "is-locked")}
              data-char={ch}
            >
              <span className="nc-assemble-char-r" aria-hidden>
                {done ? ch : (noise[i] ?? "7")}
              </span>
              <span className="nc-assemble-char-b" aria-hidden>
                {done ? ch : (noise[i] ?? "▲")}
              </span>
              <span className="nc-assemble-char-core">{done ? (ch === " " ? "\u00a0" : ch) : (noise[i] ?? "▲")}</span>
            </span>
          );
        })}
      </span>
    </Tag>
  );
}
