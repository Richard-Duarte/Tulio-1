/** Vertical mark: triangle, upside-down 7, triangle. */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 52"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M14 0 26 16H2Z" />
      <g transform="translate(14 32) rotate(180)">
        <text
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Tektur, sans-serif"
          fontSize="18"
          fontWeight="600"
        >
          7
        </text>
      </g>
      <path d="M14 52 2 36h24Z" />
    </svg>
  );
}
