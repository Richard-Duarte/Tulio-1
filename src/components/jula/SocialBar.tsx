export type SocialUrls = {
  facebook_url?: string | null;
  x_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
  soundcloud_url?: string | null;
  bandcamp_url?: string | null;
  instagram_url?: string | null;
  spotify_url?: string | null;
  beatport_url?: string | null;
  booking_email?: string | null;
};

const platforms = [
  { key: "facebook_url", label: "Facebook", icon: "/brand/social/facebook.png" },
  { key: "x_url", label: "X", icon: "/brand/social/x.png" },
  { key: "tiktok_url", label: "TikTok", icon: "/brand/social/tiktok.png" },
  { key: "youtube_url", label: "YouTube", icon: "/brand/social/youtube.png" },
  { key: "soundcloud_url", label: "SoundCloud", icon: "/brand/social/soundcloud.png" },
  { key: "bandcamp_url", label: "Bandcamp", icon: "/brand/social/bandcamp.png" },
  { key: "instagram_url", label: "Instagram", icon: "/brand/social/instagram.png" },
  { key: "spotify_url", label: "Spotify", icon: "/brand/social/spotify.png" },
  { key: "beatport_url", label: "Beatport", icon: "/brand/social/beatport.png" },
] as const;

const iconClass =
  "grid size-11 shrink-0 place-items-center transition-transform duration-300 hover:-translate-y-1";

export function SocialBar({
  links,
  all = false,
  large = false,
  footer = false,
  showEmail = true,
}: {
  links: SocialUrls;
  all?: boolean;
  large?: boolean;
  footer?: boolean;
  showEmail?: boolean;
}) {
  const items = all
    ? platforms
    : platforms.filter((item) => (links[item.key] ?? "").trim().length > 0);
  const email = showEmail ? (links.booking_email ?? "").trim() : "";
  const baseHit = footer
    ? "grid size-[22px] shrink-0 place-items-center transition-transform duration-300 hover:-translate-y-0.5"
    : large
      ? "grid size-14 shrink-0 place-items-center transition-transform duration-300 hover:-translate-y-1"
      : iconClass;
  // Mobile rows of five: a short last row stays centered under the full one.
  const hitClass = all || large || footer ? `${baseHit} max-md:w-1/5` : baseHit;
  if (!items.length && !email) return null;
  return (
    <div className="pointer-events-auto flex w-full flex-col items-center gap-3">
      {email && (
        <a
          href={`mailto:${email}`}
          className="block max-w-full text-center font-mono text-[10px] uppercase tracking-[.08em] text-white/70 transition-colors [overflow-wrap:anywhere] hover:text-white md:px-4 md:tracking-[.16em]"
        >
          Bookings · {email}
        </a>
      )}
      <div
        className={
          footer
            ? "flex w-full flex-wrap justify-center gap-y-3 md:gap-3"
            : large
            ? "flex w-full flex-wrap justify-center gap-y-8 md:gap-8"
            : all
              ? "flex w-full flex-wrap justify-center gap-y-6 md:gap-5"
              : "flex flex-wrap items-center justify-center gap-x-3 gap-y-2 md:gap-x-4"
        }
      >
        {items.map((item) => {
          const href = (links[item.key] ?? "").trim();
          const image = (
            <img
              src={item.icon}
              alt=""
              className={`${footer ? "size-[18px]" : large ? "size-11" : "size-9"} object-contain brightness-0 invert`}
              loading="lazy"
            />
          );
          if (!href) {
            return (
              <span key={item.key} className={hitClass} aria-label={item.label} title={item.label}>
                {image}
              </span>
            );
          }
          return (
            <a
              key={item.key}
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={item.label}
              title={item.label}
              className={hitClass}
            >
              {image}
            </a>
          );
        })}
      </div>
    </div>
  );
}
