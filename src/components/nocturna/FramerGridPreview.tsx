import { useEffect, useRef, useState } from "react";
import {
  createFramerGrid,
  type FramerGridHandle,
} from "@/lib/framer-grid/create-grid-scene";
import { FRAMER_SHAPE_PRESETS } from "@/lib/framer-grid/framer-defaults";
import type { GridShapeType } from "@/lib/framer-grid/shape-grid";
import { cn } from "@/lib/utils";

const SHAPES: { id: GridShapeType; label: string }[] = [
  { id: "hexagon", label: "Hexagon" },
  { id: "square", label: "Square" },
  { id: "triangle", label: "Triangle" },
  { id: "circle", label: "Circle" },
];

/**
 * grid-preview.framer.website — interactive substrate grid (Three.js port of Framer component).
 * Monochrome palette; default shape triangle (n=40).
 */
export function FramerGridPreview({
  className = "",
  shape = "triangle",
  controls = true,
  onShapeChange,
}: {
  className?: string;
  shape?: GridShapeType;
  controls?: boolean;
  onShapeChange?: (shape: GridShapeType) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<FramerGridHandle | null>(null);
  const [active, setActive] = useState<GridShapeType>(shape);

  useEffect(() => {
    setActive(shape);
  }, [shape]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Fresh canvas each mount: Three.js dispose() kills the WebGL context on that canvas
    // (React Strict Mode remounts would otherwise leave a black, dead surface).
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 block h-full w-full touch-none";
    canvas.setAttribute("aria-hidden", "true");
    host.prepend(canvas);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const preset = FRAMER_SHAPE_PRESETS[active];
    handleRef.current = createFramerGrid(canvas, {
      ...preset,
      depthScale: reduced ? 0.35 : preset.depthScale ?? 1,
      timeCoef: reduced ? 0.25 : preset.timeCoef ?? 1,
    });

    return () => {
      handleRef.current?.dispose();
      handleRef.current = null;
      canvas.remove();
    };
  }, [active]);

  return (
    <div ref={hostRef} className={cn("relative h-full w-full bg-black", className)}>
      {controls ? (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-8 pt-16">
        <div className="pointer-events-auto flex gap-0 border border-[var(--nc-border)] bg-black/80 font-mono text-[11px] uppercase tracking-[0.14em] backdrop-blur-sm">
          {SHAPES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={cn(
                "border-r border-[var(--nc-border)] px-5 py-2.5 last:border-r-0 transition-colors",
                active === id ? "bg-white text-black" : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
              onClick={() => {
                setActive(id);
                onShapeChange?.(id);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      ) : null}
    </div>
  );
}
