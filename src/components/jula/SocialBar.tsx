import instagram from "@/assets/social/instagram.png.asset.json";
import soundcloud from "@/assets/social/soundcloud.png.asset.json";
import spotify from "@/assets/social/spotify.png.asset.json";
import youtube from "@/assets/social/youtube.png.asset.json";
import bandcamp from "@/assets/social/bandcamp.png.asset.json";

export type SocialUrls = {
  instagram_url?: string | null;
  soundcloud_url?: string | null;
  spotify_url?: string | null;
  youtube_url?: string | null;
  bandcamp_url?: string | null;
};

const order = [
  { key: "instagram_url", label: "Instagram", icon: instagram.url },
  { key: "soundcloud_url", label: "SoundCloud", icon: soundcloud.url },
  { key: "spotify_url", label: "Spotify", icon: spotify.url },
  { key: "youtube_url", label: "YouTube", icon: youtube.url },
  { key: "bandcamp_url", label: "Bandcamp", icon: bandcamp.url },
] as const;

export function SocialBar({ links }: { links: SocialUrls }) {
  const items = order.filter(item => (links[item.key] ?? "").trim().length > 0);
  if (!items.length) return null;
  return (
    <div className="pointer-events-auto flex items-center justify-center gap-7">
      {items.map(item => (
        <a
          key={item.key}
          href={links[item.key] as string}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={item.label}
          className="grid size-10 place-items-center opacity-50 grayscale transition-all duration-300 hover:-translate-y-1 hover:opacity-100 hover:grayscale-0"
        >
          <img src={item.icon} alt={item.label} className="size-8 object-contain" loading="lazy" />
        </a>
      ))}
    </div>
  );
}
