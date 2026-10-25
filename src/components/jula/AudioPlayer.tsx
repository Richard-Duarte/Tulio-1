import { useQuery } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { SetsPlayer } from "@/components/sets/SetsPlayer";
import { SetsPlayerProvider } from "@/components/sets/SetsPlayerProvider";
import type { PlayerTrack } from "@/components/sets/player-store";
import { formatSetDate } from "@/lib/format";
import { latestUploadFirst } from "@/lib/sets-order";
import { getPublicMusic, getSiteSettings } from "@/lib/public.functions";

type SetRow = Awaited<ReturnType<typeof getPublicMusic>>["sets"][number];

/** The sets queue (one playlist for the whole site): the latest upload first, then the rest. */
export function setsToTracks(sets: SetRow[]): PlayerTrack[] {
  return latestUploadFirst(sets.filter((set) => set.soundcloud_url))
    .map((set) => ({
      id: set.id,
      title: set.title,
      url: set.soundcloud_url as string,
      cover: set.cover_url,
      date: formatSetDate(set.played_at),
      durationMs: (set.duration_seconds ?? 0) * 1000,
    }));
}

/**
 * ONE player for the whole site, mounted in the root layout so client-side navigation never
 * stops or restarts the music. Home, /sets and every other page share this provider/state.
 */
export function GlobalPlayerProvider({ children }: { children: ReactNode }) {
  const music = useQuery({ queryKey: ["public-music"], queryFn: () => getPublicMusic() });
  const settings = useQuery({ queryKey: ["site-settings"], queryFn: () => getSiteSettings() });
  const tracks = useMemo(() => setsToTracks(music.data?.sets ?? []), [music.data]);
  return (
    <SetsPlayerProvider
      tracks={tracks}
      initialMinimized
      shuffle={settings.data?.sets_shuffle ?? false}
      storageKey="tulio-player-min"
      ready={music.isSuccess && !settings.isPending}
    >
      {children}
    </SetsPlayerProvider>
  );
}

/** The player UI (portal to <body>); renders nothing until the sets queue has loaded. */
export function AudioPlayer() {
  return <SetsPlayer />;
}
