import { useQuery } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { SetsPlayer } from "@/components/sets/SetsPlayer";
import { SetsPlayerProvider } from "@/components/sets/SetsPlayerProvider";
import { setsToTracks } from "@/lib/sets-to-tracks";
import { getPublicMusic, getSiteSettings } from "@/lib/public.functions";

export { setsToTracks } from "@/lib/sets-to-tracks";

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
