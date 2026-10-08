/** Transport glyphs from the Tonearm reference design (24px grid, currentColor). */
type GlyphName =
  "play" | "pause" | "prev" | "next" | "back" | "forward" | "sound" | "muted" | "link" | "wave";

export function Glyph({
  name,
  size = 18,
  label,
}: {
  name: GlyphName;
  size?: number;
  label?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };
  const solid = { ...common, fill: "currentColor", stroke: "none" };
  switch (name) {
    case "play":
      return (
        <svg {...solid}>
          <path d="M8.5 5.8c0-.85.94-1.36 1.65-.9l8.3 5.4c.65.42.65 1.38 0 1.8l-8.3 5.4c-.71.46-1.65-.05-1.65-.9z" />
        </svg>
      );
    case "pause":
      return (
        <svg {...solid}>
          <rect x="6.8" y="5.2" width="3.6" height="13.6" rx="1.3" />
          <rect x="13.6" y="5.2" width="3.6" height="13.6" rx="1.3" />
        </svg>
      );
    case "prev":
      return (
        <svg {...solid}>
          <rect x="5" y="6" width="2.2" height="12" rx="1.1" />
          <path d="M19 6.8v10.4c0 .7-.8 1.1-1.4.7l-7.4-5.2a.85.85 0 0 1 0-1.4l7.4-5.2c.6-.4 1.4 0 1.4.7z" />
        </svg>
      );
    case "next":
      return (
        <svg {...solid}>
          <rect x="16.8" y="6" width="2.2" height="12" rx="1.1" />
          <path d="M5 6.8v10.4c0 .7.8 1.1 1.4.7l7.4-5.2a.85.85 0 0 0 0-1.4L6.4 6.1C5.8 5.7 5 6.1 5 6.8z" />
        </svg>
      );
    case "back":
    case "forward": {
      const back = name === "back";
      return (
        <svg {...common}>
          <path
            d={back ? "M9.8 4.2H12a7.8 7.8 0 1 1-7.8 7.8" : "M14.2 4.2H12a7.8 7.8 0 1 0 7.8 7.8"}
          />
          <path d={back ? "M12.4 1.6 9.8 4.2l2.6 2.6" : "M11.6 1.6l2.6 2.6-2.6 2.6"} />
          {label != null && (
            <text
              x="12"
              y="14.7"
              textAnchor="middle"
              fontSize="6.6"
              fontWeight="700"
              fill="currentColor"
              stroke="none"
            >
              {label}
            </text>
          )}
        </svg>
      );
    }
    case "sound":
      return (
        <svg {...common}>
          <path d="M4.8 9.6h2.9l4.1-3.3v11.4l-4.1-3.3H4.8z" />
          <path d="M15.6 9.5a3.5 3.5 0 0 1 0 5" />
          <path d="M18.2 7.1a7 7 0 0 1 0 9.8" />
        </svg>
      );
    case "muted":
      return (
        <svg {...common}>
          <path d="M4.8 9.6h2.9l4.1-3.3v11.4l-4.1-3.3H4.8z" />
          <path d="M16 10l4.2 4.2M20.2 10 16 14.2" />
        </svg>
      );
    case "link":
      return (
        <svg {...common}>
          <path d="M8 16 16 8" />
          <path d="M9.6 8H16v6.4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M4 10.5v3M7.5 8v8M11 5.5v13M14.5 8.5v7M18 10v4M21 11.2v1.6" />
        </svg>
      );
  }
}
