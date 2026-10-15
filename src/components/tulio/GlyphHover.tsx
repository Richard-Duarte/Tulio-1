import { useEffect, useRef, useState } from "react";

const GLYPHS = ["7", "▲"] as const;
/** A step slower than the first menu pass, so the letters lock in without rushing. */
export const GLYPH_STEP_MS = 64;

export function glyphFrame(text: string, step: number) {
  return [...text]
    .map((ch, i) => {
      if (ch === " ") return " ";
      if (step > 0 && i < step) return ch;
      return GLYPHS[(step + i) % 2];
    })
    .join("");
}

export function useGlyphHover(text: string) {
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
      if (step < length) timers.current.push(window.setTimeout(tick, GLYPH_STEP_MS));
    };
    timers.current.push(window.setTimeout(tick, GLYPH_STEP_MS));
  };

  return { shown, play };
}

/** Hover swaps each letter between 7 and ▲, then locks the real title in. */
export function GlyphHover({ text, className }: { text: string; className?: string }) {
  const { shown, play } = useGlyphHover(text);
  return (
    <span className={className} onPointerEnter={(event) => event.pointerType === "mouse" && play()}>
      {shown}
    </span>
  );
}
