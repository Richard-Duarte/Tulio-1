/** Tulio as Tul + upside-down 7 + o (logo wordmark). */
export function TulioWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap font-semibold leading-none tracking-[-0.03em] ${className}`}
    >
      Tul<span className="inline-block rotate-180">7</span>o
    </span>
  );
}
