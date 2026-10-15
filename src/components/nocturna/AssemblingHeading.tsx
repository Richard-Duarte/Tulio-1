import type { ElementType, ReactNode } from "react";
import { GlyphHover, TITLE_STEP_MS } from "@/components/tulio/GlyphHover";
import { cn } from "@/lib/utils";

/**
 * Page titles use the same hover as the menu: 7 and ▲, then the letters lock in.
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
  if (!text) {
    return <Tag className={cn("nc-display", className)}>{children}</Tag>;
  }

  return (
    <Tag className={cn("nc-display", className)} aria-label={text}>
      <GlyphHover text={text} stepMs={TITLE_STEP_MS} />
    </Tag>
  );
}
