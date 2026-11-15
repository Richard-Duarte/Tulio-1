import type { PlayerTrack } from "../components/sets/player-store.ts";
import { formatSetDate } from "./format.ts";

type SetRow = {
  id: string;
  title: string;
  soundcloud_url: string | null;
  cover_url: string | null;
  played_at: string | null;
  duration_seconds: number | null;
};

/** Same order as admin drag order (`sort_order` from the loader); skips rows without a SoundCloud URL. */
export function setsToTracks(sets: SetRow[]): PlayerTrack[] {
  return sets
    .filter((set) => set.soundcloud_url)
    .map((set) => ({
      id: set.id,
      title: set.title,
      url: set.soundcloud_url as string,
      cover: set.cover_url,
      date: formatSetDate(set.played_at),
      playedAt: set.played_at,
      durationMs: (set.duration_seconds ?? 0) * 1000,
    }));
}