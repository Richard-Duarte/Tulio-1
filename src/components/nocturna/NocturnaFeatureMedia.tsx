import { cn } from "@/lib/utils";

export function NocturnaFeatureMedia({
  imageUrl,
  className,
  chip,
}: {
  imageUrl?: string | null;
  className?: string;
  chip?: string;
}) {
  return (
    <div className={cn("relative h-full min-h-[240px] overflow-hidden md:min-h-[320px]", className)}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="nc-dither-img absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="nc-dither-fallback absolute inset-0" aria-hidden />
      )}
      {chip ? (
        <span className="absolute bottom-6 left-6 z-[2] border border-[var(--nc-border)] bg-black/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--nc-accent-mint)]">
          {chip}
        </span>
      ) : null}
    </div>
  );
}
