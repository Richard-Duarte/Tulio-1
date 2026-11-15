import { cn } from "@/lib/utils";

/**
 * MP4 capa when `poster_url` is missing: o elemento `<video>` exibe o frame buscado
 * (sem canvas/CORS — evita tela preta que o capture em canvas causava no Supabase).
 */
export function VideoPosterCover({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <video
      src={src}
      muted
      playsInline
      preload="auto"
      className={cn(className, "pointer-events-none")}
      aria-label={alt}
      onLoadedData={(event) => {
        const video = event.currentTarget;
        try {
          const t = Number.isFinite(video.duration)
            ? Math.min(0.35, Math.max(0, video.duration - 0.05))
            : 0.1;
          video.currentTime = t;
        } catch {
          // ignore seek errors on very short clips
        }
      }}
    />
  );
}