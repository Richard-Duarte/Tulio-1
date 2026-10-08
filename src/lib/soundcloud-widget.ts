/**
 * Minimal typed wrapper around the SoundCloud Widget API
 * (https://developers.soundcloud.com/docs/api/html5-widget). Browser-only.
 */

export type SCProgress = {
  currentPosition: number;
  relativePosition: number;
  loadedProgress?: number;
};
export type SCSound = {
  id?: number;
  title?: string;
  permalink_url?: string;
  waveform_url?: string;
  duration?: number;
  artwork_url?: string | null;
  user?: { username?: string; permalink_url?: string };
};

export interface SCWidget {
  bind(event: string, listener: (e?: SCProgress) => void): void;
  unbind(event: string): void;
  load(url: string, options?: Record<string, unknown> & { callback?: () => void }): void;
  play(): void;
  pause(): void;
  toggle(): void;
  seekTo(ms: number): void;
  setVolume(volume: number): void;
  getDuration(cb: (ms: number) => void): void;
  getPosition(cb: (ms: number) => void): void;
  isPaused(cb: (paused: boolean) => void): void;
  getCurrentSound(cb: (sound: SCSound | null) => void): void;
}

type SCGlobal = {
  Widget: ((el: HTMLIFrameElement | string) => SCWidget) & {
    Events: Record<
      "READY" | "PLAY" | "PAUSE" | "FINISH" | "SEEK" | "PLAY_PROGRESS" | "LOAD_PROGRESS" | "ERROR",
      string
    >;
  };
};

declare global {
  interface Window {
    SC?: SCGlobal;
  }
}

const API_SRC = "https://w.soundcloud.com/player/api.js";
let apiPromise: Promise<SCGlobal> | null = null;

/** Loads api.js once per page; resolves with `window.SC`. */
export function loadSoundCloudApi(): Promise<SCGlobal> {
  if (typeof window === "undefined")
    return Promise.reject(new Error("SoundCloud API is browser-only"));
  if (window.SC?.Widget) return Promise.resolve(window.SC);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<SCGlobal>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = API_SRC;
    script.async = true;
    script.onload = () =>
      window.SC?.Widget ? resolve(window.SC) : reject(new Error("SC.Widget missing"));
    script.onerror = () => {
      apiPromise = null;
      script.remove();
      reject(new Error("Failed to load SoundCloud Widget API"));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

/** Widget player options: hidden player, our own UI does the talking. */
export const widgetOptions = {
  auto_play: false,
  buying: false,
  sharing: false,
  download: false,
  show_artwork: false,
  show_playcount: false,
  show_user: true,
  show_comments: false,
  show_reposts: false,
  show_teaser: false,
  hide_related: true,
  single_active: true,
  visual: false,
  color: "#5b8cff",
};

export const widgetSrc = (trackUrl: string) =>
  `https://w.soundcloud.com/player/?${new URLSearchParams({
    url: trackUrl,
    ...Object.fromEntries(Object.entries(widgetOptions).map(([k, v]) => [k, String(v)])),
  })}`;

/**
 * Real waveform for a SoundCloud sound (wave.sndcdn.com JSON, `samples` 0..height), reduced to
 * `bars` values in 0.1..1. Returns null when unavailable (then the UI keeps its generated shape).
 */
export async function fetchWaveform(
  waveformUrl: string | undefined,
  bars: number,
): Promise<number[] | null> {
  if (!waveformUrl) return null;
  try {
    const url = waveformUrl.replace(/\.png(\?.*)?$/, ".json");
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { samples?: number[]; height?: number };
    const samples = data.samples;
    if (!samples?.length) return null;
    const bucket = samples.length / bars;
    const raw: number[] = [];
    for (let i = 0; i < bars; i++) {
      let peak = 0;
      for (let j = Math.floor(i * bucket); j < Math.floor((i + 1) * bucket); j++)
        peak = Math.max(peak, samples[j] ?? 0);
      raw.push(peak);
    }
    // DJ sets are loudness-compressed (nearly flat at full scale): stretch min..max for contrast
    const sorted = [...raw].sort((a, b) => a - b);
    const lo = sorted[Math.floor(sorted.length * 0.08)] ?? 0;
    const hi = sorted[sorted.length - 1] || data.height || 1;
    const out = raw.map(
      (p) => 0.18 + 0.82 * Math.pow(hi > lo ? Math.max(0, p - lo) / (hi - lo) : 1, 1.3),
    );
    return out;
  } catch {
    return null;
  }
}
