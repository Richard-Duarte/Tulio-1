/**
 * Monogram: two vertical rails + inverted seven between them.
 * Stroke-only mark (not the old Tul7o wordmark).
 */
export function TulioSigil({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path d="M8 4v56" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      <path d="M32 4v56" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      <path
        d="M28 14H12v7l13 13v20"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="miter"
        strokeLinecap="square"
        transform="rotate(180 20 34)"
      />
    </svg>
  );
}
