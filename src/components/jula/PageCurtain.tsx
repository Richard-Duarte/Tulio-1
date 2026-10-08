import { useEffect, useRef } from "react";
import { registerPageCurtain } from "@/lib/page-transition";

/** Overlay used by route transitions (driven by lib/page-transition.ts). Same look as the intro curtain. */
export function PageCurtain() {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const edgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    const edge = edgeRef.current;
    if (!root || !panel || !edge) return;
    return registerPageCurtain({ root, panel, edge });
  }, []);

  return (
    <div ref={rootRef} aria-hidden className="page-curtain">
      <div ref={panelRef} className="page-curtain-panel" />
      <div ref={edgeRef} className="page-curtain-edge" />
    </div>
  );
}
