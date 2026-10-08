import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

/**
 * Fullscreen YouTube player (privacy-enhanced youtube-nocookie.com embed, only mounted when opened).
 * Portaled to `document.body` for the same reason as PhotoLightbox: the `.page-enter` wrapper's
 * transform would otherwise become the containing block for `position: fixed`.
 */
export function VideoLightbox({
  video,
  onClose,
}: {
  video: { title: string; youtube_id: string; youtube_url: string };
  onClose: () => void;
}) {
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.youtube_id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  return createPortal(
    <div
      className="fixed inset-x-0 top-0 z-[90] flex h-dvh flex-col bg-background/95 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      data-lenis-prevent
      onClick={onClose}
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-border/60 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] md:px-8">
        <p className="min-w-0 flex-1 truncate font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
          {video.title}
        </p>
        <Button asChild variant="outline" onClick={stop}>
          <a href={video.youtube_url} target="_blank" rel="noreferrer">
            <span className="hidden sm:inline">{t("openOnYoutube")}</span> <ExternalLink />
          </a>
        </Button>
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
        <div
          onClick={stop}
          className="aspect-video w-full max-w-[min(100%,calc((100dvh-8rem)*16/9))] bg-black shadow-2xl"
        >
          <iframe
            title={video.title}
            src={src}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
