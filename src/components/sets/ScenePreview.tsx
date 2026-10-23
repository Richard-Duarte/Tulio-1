import { useNavigate } from "@tanstack/react-router";
import { Box, Maximize2, MousePointerClick } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { EmbedHandle } from "@/lib/underground/embed.js";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/*
 * Small live thumbnail of the /sets 3D scene inside the global player.
 *  - single click: hint overlay (expand + click icons); a tap on that icon, or a double click
 *    anywhere on the rectangle, goes to /sets
 *  - minimize/restore, remembered in localStorage; phones/touch start minimized and the 3D is
 *    not even imported until the visitor restores it
 *  - "preview" quality (DPR 1, no MSAA/shadows, tiny crowd); unmounted (GPU freed) when minimized;
 *    the scene pauses itself when the tab is hidden or the canvas is off-screen
 */

export const PREVIEW_KEY = "tulio-player-preview";
const POSTER = "/3d/underground-poster-mobile.webp";
const DOUBLE_MS = 450;

function defaultOpen() {
  const mm = (q: string) => window.matchMedia?.(q).matches;
  return !(mm("(max-width: 767px)") || mm("(pointer: coarse)"));
}

export function usePreviewOpen() {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(PREVIEW_KEY);
    } catch {
      /* private mode */
    }
    setOpen(saved === "open" ? true : saved === "min" ? false : defaultOpen());
  }, []);
  const set = (value: boolean) => {
    setOpen(value);
    try {
      window.localStorage.setItem(PREVIEW_KEY, value ? "open" : "min");
    } catch {
      /* private mode */
    }
  };
  return [open, set] as const;
}

const glass =
  "border border-border/50 bg-black/90 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.65)] backdrop-blur-sm";

export function ScenePreview() {
  const [open, setOpen] = usePreviewOpen();
  const { t } = useI18n();
  if (open === null) return null;
  if (!open)
    return (
      <button
        type="button"
        data-preview-restore=""
        onClick={() => setOpen(true)}
        aria-label={t("previewShow")}
        title={t("previewShow")}
        className={cn(
          "pointer-events-auto inline-flex h-8 items-center gap-1.5 self-end rounded-full px-3 font-mono text-[9.5px] uppercase tracking-[.16em] text-muted-foreground transition-colors hover:text-foreground",
          glass,
        )}
      >
        <Box className="size-3.5" /> 3D
      </button>
    );
  return <PreviewBox onMinimize={() => setOpen(false)} />;
}

function PreviewBox({ onMinimize }: { onMinimize: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState(false);
  const lastClick = useRef(0);
  const hintTimer = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let handle: EmbedHandle | null = null;
    let cancelled = false;
    void import("@/lib/underground/embed.js").then(({ mount }) => {
      if (cancelled) return;
      handle = mount(el, {
        orbit: true,
        controls: false,
        quality: "preview",
        modelsBaseUrl: "/3d/models/",
        strobe: true,
      });
      handle.ready.then(
        () => !cancelled && setReady(true),
        () => undefined,
      );
    });
    return () => {
      cancelled = true;
      handle?.dispose();
      window.clearTimeout(hintTimer.current);
    };
  }, []);

  const openSets = () => {
    lastClick.current = 0;
    window.clearTimeout(hintTimer.current);
    setHint(false);
    void navigate({ to: "/sets" });
  };

  const onClick = () => {
    const now = performance.now();
    if (now - lastClick.current < DOUBLE_MS) return openSets();
    lastClick.current = now;
    setHint(true);
    window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(false), 2600);
  };

  return (
    <div
      data-scene-preview=""
      className={cn(
        "pointer-events-auto relative aspect-video w-[168px] self-end overflow-hidden rounded-lg md:w-[200px]",
        glass,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={t("previewOpenSets")}
        title={t("previewOpenSets")}
        tabIndex={hint ? -1 : 0}
        className="absolute inset-0 block size-full cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-primary"
      >
        <img
          src={POSTER}
          alt=""
          className="absolute inset-0 size-full object-cover transition-opacity duration-700"
          style={{ opacity: ready ? 0 : 0.7 }}
        />
        <div
          ref={ref}
          className="pointer-events-none absolute inset-0 transition-opacity duration-700"
          style={{ opacity: ready ? 1 : 0 }}
        />
      </button>
      {/* hint overlay: the dimmed area still counts as the rectangle (double click), the icon
          itself is a real button — one tap on it opens /sets */}
      <div
        data-preview-hint={hint ? "" : undefined}
        aria-hidden={hint ? undefined : true}
        onClick={onClick}
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/55 text-foreground transition-opacity duration-200",
          hint ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <button
          type="button"
          data-preview-open=""
          tabIndex={hint ? 0 : -1}
          onClick={(e) => {
            e.stopPropagation();
            openSets();
          }}
          aria-label={t("previewOpenSets")}
          title={t("previewOpenSets")}
          className="relative flex size-14 cursor-pointer items-center justify-center rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span className="relative flex size-11 items-center justify-center rounded-md border border-foreground/70 transition-colors hover:bg-foreground/10">
            <Maximize2 className="size-4" />
            <MousePointerClick className="absolute -bottom-2.5 -right-3 size-5 drop-shadow" />
          </span>
        </button>
      </div>
      <button
        type="button"
        data-preview-minimize=""
        onClick={onMinimize}
        aria-label={t("previewHide")}
        title={t("previewHide")}
        className="absolute right-1 top-1 z-10 inline-flex size-6 items-center justify-center rounded-full bg-black/70 text-foreground/80 transition-colors hover:text-foreground"
      >
        <span className="block h-0.5 w-2.5 rounded-full bg-current" />
      </button>
    </div>
  );
}
