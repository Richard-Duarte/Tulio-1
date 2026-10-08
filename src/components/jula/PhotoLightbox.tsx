import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Download, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

type LightboxPhoto = { id: string; title: string; public_url: string | null; alt_text: string };

/**
 * Fullscreen photo viewer.
 *
 * Rendered through a portal on `document.body`: route content lives inside the
 * `.page-enter` wrapper, whose transform animation (fill-mode `both`) turns it
 * into the containing block for `position: fixed` descendants and traps
 * z-index in its stacking context. Rendering inline made the overlay as tall as
 * the whole page (close button at the top of the page, download button at the
 * very bottom) and left it underneath the site header.
 */
export function PhotoLightbox({
  photo,
  onClose,
  onDownload,
  downloading = false,
}: {
  photo: LightboxPhoto;
  onClose: () => void;
  onDownload?: (() => void) | undefined;
  downloading?: boolean;
}) {
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Scroll lock, Esc to close and focus management while open.
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    const prevPadding = html.style.paddingRight;
    const scrollbar = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    if (scrollbar > 0) html.style.paddingRight = `${scrollbar}px`;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
      html.style.paddingRight = prevPadding;
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, []);

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return createPortal(
    <div
      className="fixed inset-x-0 top-0 z-[90] flex h-dvh flex-col bg-background/95 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label={photo.title}
      data-lenis-prevent
      onClick={onClose}
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-border/60 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] md:px-8">
        <p className="min-w-0 flex-1 truncate font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
          {photo.title}
        </p>
        {onDownload && (
          <Button onClick={(e) => (stop(e), onDownload())} disabled={downloading}>
            {downloading ? <LoaderCircle className="animate-spin" /> : <Download />}
            {downloading ? t("downloading") : t("downloadPhoto")}
          </Button>
        )}
        <Button
          ref={closeRef}
          variant="outline"
          size="icon"
          onClick={(e) => (stop(e), onClose())}
          aria-label={t("close")}
        >
          <X />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:p-8">
        <img
          src={photo.public_url ?? ""}
          alt={photo.alt_text}
          onClick={stop}
          className="max-h-full max-w-full object-contain shadow-2xl"
        />
      </div>
    </div>,
    document.body,
  );
}
