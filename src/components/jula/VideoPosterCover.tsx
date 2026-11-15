import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** When poster_url is missing, paint the first frame from a storage MP4 (same-origin / CORS). */
export function VideoPosterCover({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [thumb, setThumb] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const cleanup = () => {
      video.onerror = null;
      video.onloadeddata = null;
      video.onseeked = null;
      video.src = "";
    };

    video.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    video.onloadeddata = () => {
      const t = Number.isFinite(video.duration)
        ? Math.min(0.25, Math.max(0, video.duration - 0.05))
        : 0.25;
      video.currentTime = t;
    };
    video.onseeked = () => {
      if (cancelled) return;
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) {
          setFailed(true);
          return;
        }
        const canvas = document.createElement("canvas");
        const max = 960;
        const scale = Math.min(1, max / Math.max(w, h));
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setFailed(true);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumb(canvas.toDataURL("image/jpeg", 0.85));
      } catch {
        setFailed(true);
      }
    };
    video.src = src;
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [src]);

  if (thumb) {
    return <img src={thumb} alt={alt} className={className} loading="lazy" />;
  }
  if (failed) {
    return <div className={cn(className, "bg-card")} aria-hidden />;
  }
  return <div className={cn(className, "animate-pulse bg-card")} aria-hidden />;
}