import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function NocturnaContainer({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("nc-container", className)}>{children}</div>;
}

export { SectionTransition as NocturnaSection } from "@/components/nocturna/SectionTransition";

export function NocturnaEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="nc-eyebrow flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em]">
      <span className="nc-dot" aria-hidden />
      {children}
    </p>
  );
}

export function NocturnaBadge({ children }: { children: ReactNode }) {
  return (
    <span className="nc-badge font-mono text-[11px] uppercase tracking-[0.1em]">{children}</span>
  );
}
