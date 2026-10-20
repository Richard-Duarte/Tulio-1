/** Official TULIO wordmark. Height follows the surrounding font size. */
export function TulioWordmark({ className = "" }: { className?: string }) {
  return (
    <img
      src="/brand/tulio-wordmark.png"
      alt="Tulio"
      className={`inline-block h-[1em] w-auto max-w-none ${className}`}
    />
  );
}
