import { useSyncExternalStore } from "react";

/** One playable set in the /sets player queue. */
export type PlayerTrack = {
  id: string;
  title: string;
  /** SoundCloud permalink (streamed through the Widget API; also the attribution link). */
  url: string;
  cover: string | null;
  /** "18.07.2026" */
  date: string | null;
  /** Known length from the database (ms), used until the widget reports the real one. */
  durationMs: number;
};

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error" | "blocked";

export type PlayerState = {
  tracks: PlayerTrack[];
  index: number;
  status: PlayerStatus;
  /** ms */
  position: number;
  /** ms (0 = unknown) */
  duration: number;
  /** 0..100 */
  volume: number;
  muted: boolean;
  /** real SoundCloud waveform for the current track (0.1..1), null = generated shape */
  peaks: number[] | null;
  minimized: boolean;
  /** SoundCloud uploader of the current sound, for attribution */
  artist: { name: string; url: string } | null;
};

type Listener = () => void;

export function createPlayerStore(initial: PlayerState) {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set(patch: Partial<PlayerState> | ((s: PlayerState) => Partial<PlayerState>)) {
      const next = typeof patch === "function" ? patch(state) : patch;
      let changed = false;
      for (const k in next) {
        if (next[k as keyof PlayerState] !== state[k as keyof PlayerState]) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...next };
      listeners.forEach((l) => l());
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
export type PlayerStore = ReturnType<typeof createPlayerStore>;

export function useStoreSelector<T>(store: PlayerStore, select: (s: PlayerState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.get()),
    () => select(store.get()),
  );
}

/** Deterministic pseudo-waveform (same shape on server and client) until the real one arrives. */
export function syntheticPeaks(key: string, count: number): number[] {
  let acc = 2166136261;
  for (let i = 0; i < key.length; i++) {
    acc ^= key.charCodeAt(i);
    acc = Math.imul(acc, 16777619) >>> 0;
  }
  let state = acc || 2654435769;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
  const out: number[] = [];
  let drift = 0.45;
  for (let i = 0; i < count; i++) {
    drift = drift * 0.7 + next() * 0.3;
    const swell = 0.5 + 0.5 * Math.sin((i / count) * Math.PI);
    const spark = next() < 0.08 ? 0.28 : 0;
    out.push(Math.max(0.1, Math.min(1, (drift * 0.7 + swell * 0.26 + spark) * 1.05)));
  }
  return out;
}

export function clock(ms: number) {
  const seconds = ms / 1000;
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
