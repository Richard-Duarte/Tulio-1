import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchWaveform,
  loadSoundCloudApi,
  widgetOptions,
  widgetSrc,
  type SCProgress,
  type SCWidget,
} from "@/lib/soundcloud-widget";
import {
  createPlayerStore,
  type PlayerState,
  type PlayerStore,
  type PlayerTrack,
} from "./player-store";

export const WAVE_BARS = 64;
const MIN_KEY = "jula-sets-player-min";
/** No PLAY event this long after a play request => the browser blocked autoplay in the iframe. */
const BLOCKED_AFTER_MS = 6000;

export type PlayerActions = {
  playIndex: (index: number) => void;
  toggle: () => void;
  step: (dir: 1 | -1) => void;
  seek: (ms: number) => void;
  skip: (deltaMs: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setMinimized: (minimized: boolean) => void;
};

type Ctx = {
  store: PlayerStore;
  actions: PlayerActions;
  iframeSrc: string | null;
  iframeRef: (el: HTMLIFrameElement | null) => void;
};
const PlayerContext = createContext<Ctx | null>(null);

export function useSetsPlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("useSetsPlayer must be used inside <SetsPlayerProvider>");
  return ctx;
}

/**
 * Drives one hidden SoundCloud widget iframe through the Widget API and exposes the state as a
 * small external store (so the 10 Hz progress updates only re-render what reads them).
 */
class SoundCloudController {
  private widget: SCWidget | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private ready: Promise<SCWidget> | null = null;
  private resolveReady: ((w: SCWidget) => void) | null = null;
  private loaded = -1;
  private wantPlay = false;
  private pendingSeek: number | null = null;
  private blockTimer = 0;
  private peaks = new Map<number, number[] | null>();
  private disposed = false;
  /** Load-time autoplay attempt still waiting for a user gesture (browsers block audible autoplay). */
  private autoPending = false;
  private offGesture: (() => void) | null = null;

  constructor(
    private store: PlayerStore,
    private setSrc: (src: string) => void,
    private shuffle: boolean,
    private storageKey: string,
  ) {}

  private get s() {
    return this.store.get();
  }

  /** Called by the iframe ref once React rendered it with its first src. */
  attach(el: HTMLIFrameElement | null) {
    if (!el || el === this.iframe) return;
    this.iframe = el;
    loadSoundCloudApi()
      .then((SC) => {
        if (this.disposed || !this.iframe) return;
        const w = SC.Widget(this.iframe);
        const E = SC.Widget.Events;
        w.bind(E.READY, () => this.onReady(w));
        w.bind(E.PLAY, () => this.onPlay());
        w.bind(E.PAUSE, () => {
          if (this.s.status === "loading") return; // pause of the previous sound while switching
          // blocked load-time autoplay (PLAY then PAUSE, no progress): still just "ready"
          this.store.set({ status: this.autoPending && this.s.position === 0 ? "idle" : "paused" });
        });
        w.bind(E.FINISH, () => this.onFinish());
        w.bind(E.PLAY_PROGRESS, (e?: SCProgress) => {
          if (!e) return;
          // real playback (a blocked autoplay can still report PLAY): no gesture needed anymore
          if (e.currentPosition > 0) this.stopAutoplay();
          const patch: Partial<PlayerState> = { position: e.currentPosition };
          if (this.s.status === "loading" || this.s.status === "blocked") patch.status = "playing";
          this.store.set(patch);
        });
        w.bind(E.SEEK, (e?: SCProgress) => e && this.store.set({ position: e.currentPosition }));
        w.bind(E.ERROR, () => {
          window.clearTimeout(this.blockTimer);
          this.store.set({ status: "error" });
        });
      })
      .catch(() => this.store.set({ status: "error" }));
  }

  private onReady(w: SCWidget) {
    this.widget = w;
    const { volume, muted } = this.s;
    w.setVolume(muted ? 0 : volume);
    this.fetchSoundInfo();
    if (this.resolveReady) {
      this.resolveReady(w);
      this.resolveReady = null;
    }
    if (this.wantPlay) w.play();
  }

  private onPlay() {
    window.clearTimeout(this.blockTimer);
    this.wantPlay = false;
    this.store.set({ status: "playing" });
    this.widget?.getDuration((ms) => ms > 0 && this.store.set({ duration: ms }));
    if (this.pendingSeek != null) {
      this.widget?.seekTo(this.pendingSeek);
      this.pendingSeek = null;
    }
  }

  private onFinish() {
    const { index, tracks } = this.s;
    if (tracks.length === 0) return;
    const next =
      this.shuffle && tracks.length > 1
        ? (index + 1 + Math.floor(Math.random() * (tracks.length - 1))) % tracks.length
        : (index + 1) % tracks.length;
    this.playIndex(next);
  }

  private fetchSoundInfo() {
    const index = this.loaded;
    this.widget?.getCurrentSound((sound) => {
      if (this.disposed || index !== this.loaded || !sound) return;
      const user = sound.user;
      this.store.set({
        artist: user?.username
          ? { name: user.username, url: user.permalink_url ?? "https://soundcloud.com" }
          : null,
      });
      if (sound.duration) this.store.set({ duration: sound.duration });
      if (this.peaks.has(index)) {
        this.store.set({ peaks: this.peaks.get(index) ?? null });
        return;
      }
      fetchWaveform(sound.waveform_url, WAVE_BARS).then((peaks) => {
        this.peaks.set(index, peaks);
        if (!this.disposed && index === this.loaded) this.store.set({ peaks });
      });
    });
  }

  private ensureWidget(index: number): Promise<SCWidget> {
    if (this.ready) return this.ready;
    this.ready = new Promise<SCWidget>((resolve) => (this.resolveReady = resolve));
    const track = this.s.tracks[index];
    if (track) {
      this.loaded = index;
      this.setSrc(widgetSrc(track.url));
    }
    return this.ready;
  }

  private armBlockedCheck() {
    window.clearTimeout(this.blockTimer);
    this.blockTimer = window.setTimeout(() => {
      if (this.s.status === "loading") this.store.set({ status: "blocked", minimized: false });
    }, BLOCKED_AFTER_MS);
  }

  /**
   * On page load: make `index` current and try to start it right away. If the browser blocks it
   * (no user gesture yet) nothing is shown as an error; playback starts on the first gesture
   * anywhere on the page instead — unless the visitor pressed pause/play themselves first.
   */
  autoplay = (index: number) => {
    const track = this.s.tracks[index];
    if (!track || this.autoPending || this.loaded !== -1) return;
    this.autoPending = true;
    this.store.set({ index, position: 0, duration: track.durationMs, peaks: null, artist: null });
    this.wantPlay = true; // READY plays it if the browser allows
    void this.ensureWidget(index);
    const onGesture = (e: Event) => {
      const target = e.target as Element | null;
      // the player's own controls handle their gesture themselves (play, pick a set, ...)
      if (
        target?.closest?.("[data-sets-player] :is(button, a, input, [role=button], [role=slider])")
      )
        return this.stopAutoplay();
      const { status, index: current } = this.s;
      this.stopAutoplay();
      if (status !== "playing" && status !== "loading") this.playIndex(current);
    };
    const opts = { capture: true, passive: true } as const;
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((type) => window.addEventListener(type, onGesture, opts));
    this.offGesture = () =>
      events.forEach((type) => window.removeEventListener(type, onGesture, opts));
  };

  private stopAutoplay() {
    this.autoPending = false;
    this.offGesture?.();
    this.offGesture = null;
  }

  playIndex = (index: number) => {
    const track = this.s.tracks[index];
    if (!track) return;
    const switching = index !== this.s.index || index !== this.loaded;
    this.store.set(
      switching
        ? {
            index,
            status: "loading",
            position: 0,
            duration: track.durationMs,
            peaks: this.peaks.get(index) ?? null,
            artist: null,
          }
        : { status: "loading" },
    );
    this.wantPlay = true;
    this.armBlockedCheck();
    if (!this.widget) {
      // First play: the iframe is created with this track, READY then starts it.
      if (this.loaded !== -1 && this.loaded !== index) {
        // iframe already booting with another track: switch once it's ready
        void this.ensureWidget(index).then(() => this.playIndex(index));
      } else void this.ensureWidget(index);
      return;
    }
    if (this.loaded !== index) {
      this.loaded = index;
      this.widget.load(track.url, {
        ...widgetOptions,
        auto_play: true,
        callback: () => this.widget?.play(),
      });
    } else this.widget.play();
  };

  toggle = () => {
    this.stopAutoplay(); // the visitor took over: never force playback after this
    const { status, index } = this.s;
    if (status === "playing") {
      this.widget?.pause();
      this.store.set({ status: "paused" });
    } else if (status === "loading" || status === "blocked") {
      this.wantPlay = false;
      window.clearTimeout(this.blockTimer);
      this.widget?.pause();
      this.store.set({ status: this.s.position > 0 ? "paused" : "idle" });
    } else this.playIndex(index);
  };

  step = (dir: 1 | -1) => {
    const { index, tracks, position, status } = this.s;
    if (dir < 0 && position > 3000 && this.loaded === index) {
      this.seek(0);
      return;
    }
    const next = (index + dir + tracks.length) % tracks.length;
    if (status === "playing" || status === "loading") this.playIndex(next);
    else {
      const t = tracks[next];
      this.store.set({
        index: next,
        status: "idle",
        position: 0,
        duration: t?.durationMs ?? 0,
        peaks: this.peaks.get(next) ?? null,
        artist: null,
      });
    }
  };

  seek = (ms: number) => {
    const { duration, index, status } = this.s;
    const target = Math.max(0, duration ? Math.min(ms, duration - 500) : ms);
    this.store.set({ position: target });
    if (this.widget && this.loaded === index && status !== "idle") this.widget.seekTo(target);
    else {
      this.pendingSeek = target;
      this.playIndex(index);
    }
  };

  skip = (deltaMs: number) => this.seek(this.s.position + deltaMs);

  setVolume = (volume: number) => {
    const v = Math.round(Math.max(0, Math.min(100, volume)));
    this.store.set({ volume: v, muted: v === 0 });
    this.widget?.setVolume(v);
  };

  toggleMute = () => {
    const muted = !this.s.muted;
    const volume = !muted && this.s.volume === 0 ? 60 : this.s.volume;
    this.store.set({ muted, volume });
    this.widget?.setVolume(muted ? 0 : volume);
  };

  setMinimized = (minimized: boolean) => {
    this.store.set({ minimized });
    try {
      window.sessionStorage.setItem(this.storageKey, minimized ? "1" : "0");
    } catch {
      /* private mode */
    }
  };

  dispose() {
    this.disposed = true;
    this.stopAutoplay();
    window.clearTimeout(this.blockTimer);
    try {
      this.widget?.pause();
    } catch {
      /* iframe already gone */
    }
    this.widget = null;
  }
}

export function SetsPlayerProvider({
  tracks,
  children,
  initialMinimized = false,
  shuffle = false,
  storageKey = MIN_KEY,
}: {
  tracks: PlayerTrack[];
  children: ReactNode;
  initialMinimized?: boolean;
  shuffle?: boolean;
  storageKey?: string;
}) {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const store = useMemo(
    () =>
      createPlayerStore({
        tracks,
        // first set on the server render; a random one is picked on the client (see below)
        index: 0,
        status: "idle",
        position: 0,
        duration: tracks[0]?.durationMs ?? 0,
        volume: 90,
        muted: false,
        peaks: null,
        minimized: initialMinimized,
        artist: null,
      }),
    // tracks come from the route loader; a new list means a new page visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const controllerRef = useRef<SoundCloudController | null>(null);
  if (!controllerRef.current)
    controllerRef.current = new SoundCloudController(store, setIframeSrc, shuffle, storageKey);
  const controller = controllerRef.current;

  useEffect(() => {
    store.set({ tracks });
  }, [store, tracks]);

  // Initial minimized state: remembered for the session, otherwise expanded — the player and its
  // queue are the whole /sets page, on phones too.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.sessionStorage.getItem(storageKey);
    } catch {
      /* private mode */
    }
    store.set({ minimized: saved ? saved === "1" : initialMinimized });
  }, [store, initialMinimized, storageKey]);

  // Something is always playing on /sets: a random set, started as soon as the browser allows.
  useEffect(() => {
    const { tracks: list } = store.get();
    if (list.length > 0) controller.autoplay(shuffle ? Math.floor(Math.random() * list.length) : 0);
  }, [store, controller, shuffle]);

  useEffect(() => () => controller.dispose(), [controller]);

  const actions = useMemo<PlayerActions>(
    () => ({
      playIndex: controller.playIndex,
      toggle: controller.toggle,
      step: controller.step,
      seek: controller.seek,
      skip: controller.skip,
      setVolume: controller.setVolume,
      toggleMute: controller.toggleMute,
      setMinimized: controller.setMinimized,
    }),
    [controller],
  );
  const value = useMemo<Ctx>(
    () => ({ store, actions, iframeSrc, iframeRef: (el) => controller.attach(el) }),
    [store, actions, iframeSrc, controller],
  );
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
