import { useEffect, useRef, useState } from "react";

const GLYPHS = ["7", "▲"] as const;
/** Menu pace. Titles use a shorter step so a long heading locks in sooner. */
export const GLYPH_STEP_MS = 64;
export const TITLE_STEP_MS = 28;

export function glyphFrame(text: string, step: number) {
  return [...text]
    .map((ch, i) => {
      if (ch === " ") return " ";
      if (step > 0 && i < step) return ch;
      return GLYPHS[(step + i) % 2];
    })
    .join("");
}

export function useGlyphHover(text: string, stepMs = GLYPH_STEP_MS) {
  const [shown, setShown] = useState(text);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setShown(text);
  }, [text]);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  const play = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    const length = [...text].length;
    setShown(glyphFrame(text, 0));
    let step = 0;
    const tick = () => {
      step += 1;
      setShown(glyphFrame(text, step));
      if (step < length) timers.current.push(window.setTimeout(tick, stepMs));
    };
    timers.current.push(window.setTimeout(tick, stepMs));
  };

  return { shown, play };
}

/** Hover swaps each letter between 7 and ▲, then locks the real title in. */
export function GlyphHover({
  text,
  className,
  stepMs = GLYPH_STEP_MS,
}: {
  text: string;
  className?: string;
  stepMs?: number;
}) {
  const { shown, play } = useGlyphHover(text, stepMs);
  return (
    <span className={className} onPointerEnter={(event) => event.pointerType === "mouse" && play()}>
      {shown}
    </span>
  );
}
