import { useEffect, useRef } from "react";

const SLICES = 8;
const INTERVAL_MS = 340;
const SHIFT_PERCENT = 1.4;
const JITTER = 0.16;
const HOLD_TICKS = 3;

/**
 * Even-mode glitch from the Framer Glitch Effect: equal horizontal bands,
 * occasional small shifts that hold for a few frames.
 */
export function ImageGlitch({ src, alt }: { src: string; alt: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const bands = [...root.querySelectorAll<HTMLElement>("[data-slice]")];
    const hold = bands.map(() => 0);
    let timer = 0;

    const tick = () => {
      bands.forEach((band, index) => {
        if (hold[index] > 0) {
          hold[index] -= 1;
          return;
        }
        if (Math.random() < JITTER) {
          const shift = (Math.random() * 2 - 1) * SHIFT_PERCENT;
          band.style.transform = `translate3d(${shift}%, 0, 0)`;
          hold[index] = HOLD_TICKS;
        } else {
          band.style.transform = "translate3d(0, 0, 0)";
        }
      });
      timer = window.setTimeout(tick, INTERVAL_MS);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative h-[46vh] w-full overflow-hidden md:h-full md:min-h-0"
      style={{
        opacity: 0.78,
        mixBlendMode: "lighten",
        maskImage:
          "linear-gradient(to right, transparent 0%, #000 20%, #000 100%), linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, #000 20%, #000 100%), linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    >
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover grayscale" />
      {Array.from({ length: SLICES }, (_, index) => {
        const top = (index / SLICES) * 100;
        const bottom = ((SLICES - index - 1) / SLICES) * 100;
        return (
          <div
            key={index}
            data-slice
            aria-hidden
            className="absolute inset-0 bg-cover bg-center grayscale transition-transform duration-200 ease-out"
            style={{
              backgroundImage: `url(${src})`,
              clipPath: `inset(${top}% 0 ${bottom}% 0)`,
            }}
          />
        );
      })}
    </div>
  );
}
