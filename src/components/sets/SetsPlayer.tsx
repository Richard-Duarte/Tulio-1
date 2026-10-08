import { ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Glyph } from "./player-glyphs";
import {
  clock,
  syntheticPeaks,
  useStoreSelector,
  type PlayerStatus,
  type PlayerTrack,
} from "./player-store";
import { WAVE_BARS, useSetsPlayer } from "./SetsPlayerProvider";

/*
 * Floating /sets player — a dark take on the "Tonearm" Framer component (now-playing panel with
 * artwork, status pill, waveform scrubber, transport with ±15/30 s skips, and an "up next"
 * queue), dressed like the site's floating header: translucent background, blur, hairline
 * border, mono uppercase labels. Minimizes to a pill that only shows the playing set.
 */

const SKIP_BACK = 15;
const SKIP_AHEAD = 30;

// Same glass recipe as the SiteHeader bar.
const glass =
  "border border-border/50 bg-background/40 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.65)] backdrop-blur-sm";
const panel = "rounded-lg border border-border/40 bg-background/35";
const iconBtn =
  "inline-flex shrink-0 items-center justify-center rounded-full text-foreground/75 transition-[color,background-color,transform,opacity] duration-150 hover:text-foreground active:scale-90 disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const css = `
@keyframes sets-eq { 0%,100% { height: 4px } 50% { height: 13px } }
@keyframes sets-pulse { 0%,100% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-primary) 55%, transparent) } 50% { box-shadow: 0 0 0 4px transparent } }
@keyframes sets-spin { to { transform: rotate(360deg) } }
@keyframes sets-busy { to { transform: rotate(360deg) } }
.sets-eq span { display:block; width:3px; border-radius:2px; background: var(--color-primary); animation: sets-eq 900ms ease-in-out infinite }
.sets-eq span:nth-child(2) { animation-delay: -300ms } .sets-eq span:nth-child(3) { animation-delay: -600ms }
@media (prefers-reduced-motion: reduce) { .sets-eq span, .sets-anim { animation: none !important } }
`;

function useStatusLabel(status: PlayerStatus, hasPosition: boolean) {
  const { t } = useI18n();
  switch (status) {
    case "playing":
      return t("playerPlaying");
    case "loading":
      return t("playerLoading");
    case "blocked":
      return t("playerTapToStart");
    case "error":
      return t("playerUnavailable");
    case "paused":
      return t("playerPaused");
    default:
      return hasPosition ? t("playerPaused") : t("playerReady");
  }
}

export function SetsPlayer() {
  const { store, iframeSrc, iframeRef } = useSetsPlayer();
  const { t } = useI18n();
  const minimized = useStoreSelector(store, (s) => s.minimized);
  const blocked = useStoreSelector(store, (s) => s.status === "blocked");
  const hasTracks = useStoreSelector(store, (s) => s.tracks.length > 0);
  // Portal to <body>: the route content sits in a transformed `.page-enter` wrapper, which would
  // otherwise turn `position: fixed` into "fixed to that wrapper". Client-only, so no hydration diff.
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  if (!host || !hasTracks) return null;

  return createPortal(
    <MotionConfig reducedMotion="user">
      <style>{css}</style>
      <div
        className="pointer-events-none fixed inset-x-2 bottom-[max(env(safe-area-inset-bottom),0.5rem)] z-[45] flex flex-col items-stretch gap-2 md:inset-x-auto md:bottom-5 md:right-5 md:w-[400px] md:items-end"
        data-sets-player=""
      >
        {/* SoundCloud widget: streams the audio; hidden unless the browser wants a tap inside it. */}
        {iframeSrc && (
          <div
            className={cn(
              blocked && !minimized
                ? `pointer-events-auto w-full overflow-hidden rounded-xl p-1.5 ${glass}`
                : // real size (the widget draws its waveform on a canvas and throws at 0×0), but
                  // invisible and tucked behind the player
                  "pointer-events-none absolute bottom-0 right-0 -z-10 w-[300px] max-w-full overflow-hidden opacity-0",
            )}
            aria-hidden={!blocked}
          >
            {blocked && !minimized && (
              <p className="px-1.5 pb-1.5 pt-0.5 font-mono text-[10px] uppercase tracking-[.16em] text-primary">
                {t("playerTapToStart")}
              </p>
            )}
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              title="SoundCloud"
              allow="autoplay; encrypted-media"
              tabIndex={blocked ? 0 : -1}
              className="h-[120px] w-full rounded-md border-0"
            />
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          {minimized ? <MiniPlayer key="mini" /> : <FullPlayer key="full" />}
        </AnimatePresence>
      </div>
    </MotionConfig>,
    host,
  );
}

/* ─────────────────────────────── shared bits ─────────────────────────────── */

function PlayRing({ size, knob, glyph }: { size: number; knob: number; glyph: number }) {
  const { store, actions } = useSetsPlayer();
  const { t } = useI18n();
  const status = useStoreSelector(store, (s) => s.status);
  const progress = useStoreSelector(store, (s) =>
    s.duration > 0 ? Math.min(1, s.position / s.duration) : 0,
  );
  const running = status === "playing";
  const busy = status === "loading";
  const r = size / 2 - 1.5;
  const circ = 2 * Math.PI * r;
  return (
    <button
      type="button"
      onClick={actions.toggle}
      aria-label={running || busy ? t("pause") : t("play")}
      className="group relative inline-flex shrink-0 items-center justify-center rounded-full transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-foreground/15"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          className="stroke-primary"
          style={{ opacity: progress > 0 ? 1 : 0 }}
        />
      </svg>
      {busy && (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
          className="sets-anim pointer-events-none absolute inset-0"
          style={{ animation: "sets-busy 900ms linear infinite" }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={`${circ * 0.22} ${circ}`}
            className="stroke-foreground"
          />
        </svg>
      )}
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-foreground text-background transition-shadow duration-300",
          running && "shadow-[0_6px_22px_-6px_var(--glow)]",
        )}
        style={{ width: knob, height: knob }}
      >
        <Glyph name={running || busy ? "pause" : "play"} size={glyph} />
      </span>
    </button>
  );
}

function StatusPill() {
  const { store } = useSetsPlayer();
  const status = useStoreSelector(store, (s) => s.status);
  const hasPosition = useStoreSelector(store, (s) => s.position > 0);
  const label = useStatusLabel(status, hasPosition);
  const dot =
    status === "error"
      ? "bg-destructive"
      : status === "playing"
        ? "bg-primary"
        : status === "loading" || status === "blocked"
          ? "bg-primary/60"
          : "bg-foreground/25";
  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border/60 px-2 py-[5px] font-mono text-[9.5px] uppercase leading-none tracking-[.16em]",
        status === "playing" ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", dot, status === "playing" && "sets-anim")}
        style={
          status === "playing" ? { animation: "sets-pulse 1600ms ease-in-out infinite" } : undefined
        }
      />
      {label}
    </span>
  );
}

function Cover({
  track,
  className,
  round,
  style,
}: {
  track: PlayerTrack | undefined;
  className?: string;
  round?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      style={style}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-accent to-primary/70 text-foreground",
        round ? "rounded-full" : "rounded-md",
        className,
      )}
    >
      {track?.cover ? (
        <img src={track.cover} alt="" draggable={false} className="size-full object-cover" />
      ) : (
        <Glyph name="wave" size={18} />
      )}
    </span>
  );
}

/* ─────────────────────────────── full player ─────────────────────────────── */

function FullPlayer() {
  const { store, actions } = useSetsPlayer();
  const { t } = useI18n();
  const track = useStoreSelector(store, (s) => s.tracks[s.index]);
  const count = useStoreSelector(store, (s) => s.tracks.length);
  const running = useStoreSelector(store, (s) => s.status === "playing");

  const onKeys = (e: KeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (tag === "input" || tag === "a" || tag === "iframe") return;
    if (
      (e.key === " " &&
        tag !== "button" &&
        target.getAttribute("role") !== "button" &&
        target.getAttribute("role") !== "slider") ||
      e.key === "k" ||
      e.key === "K"
    ) {
      e.preventDefault();
      actions.toggle();
    } else if (e.key === "l" || e.key === "L") actions.skip(SKIP_AHEAD * 1000);
    else if (e.key === "j" || e.key === "J") actions.skip(-SKIP_BACK * 1000);
    else if (e.key === "n" || e.key === "N") actions.step(1);
    else if (e.key === "p" || e.key === "P") actions.step(-1);
  };

  const meta = track?.date ?? "";

  return (
    <motion.section
      role="region"
      aria-label={t("setsPlayer")}
      onKeyDown={onKeys}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ transformOrigin: "bottom right" }}
      className={cn(
        "pointer-events-auto flex max-h-[calc(100dvh-5.25rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full flex-col gap-1.5 rounded-xl p-1.5 md:max-h-[calc(100dvh-6.5rem)] md:gap-2 md:p-2",
        glass,
      )}
    >
      <div className={cn(panel, "flex shrink-0 flex-col gap-3.5 p-3.5 md:gap-4 md:p-4")}>
        <div className="flex items-center gap-3.5">
          <Cover
            track={track}
            className={cn(
              "size-[64px] transition-[transform,box-shadow] duration-500 md:size-[76px]",
              running
                ? "scale-100 shadow-[0_10px_24px_-12px_rgb(0_0_0/0.8)]"
                : "scale-[.97] shadow-[0_4px_12px_-8px_rgb(0_0_0/0.6)]",
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex min-w-0 items-center gap-2">
              <StatusPill />
              {meta && (
                <span className="truncate font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">
                  {meta}
                </span>
              )}
            </div>
            <p
              className="line-clamp-2 font-display text-[15px] uppercase leading-[1.15] text-foreground md:text-[17px]"
              title={track?.title}
            >
              {track?.title}
            </p>
          </div>
          <button
            type="button"
            onClick={() => actions.setMinimized(true)}
            aria-label={t("minimizePlayer")}
            title={t("minimizePlayer")}
            className={cn(
              iconBtn,
              "size-8 self-start border border-border/50 text-muted-foreground",
            )}
          >
            <ChevronDown className="size-4" />
          </button>
        </div>

        <Waveform />

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
          <div className="justify-self-start">
            <SoundCloudCredit />
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => actions.step(-1)}
              disabled={count < 2}
              aria-label={t("previous")}
              className={cn(iconBtn, "size-8")}
            >
              <Glyph name="prev" size={16} />
            </button>
            <button
              type="button"
              onClick={() => actions.skip(-SKIP_BACK * 1000)}
              aria-label={t("skipBack", { n: SKIP_BACK })}
              className={cn(iconBtn, "size-9")}
            >
              <Glyph name="back" size={25} label={SKIP_BACK} />
            </button>
            <span className="mx-1.5 flex">
              <PlayRing size={56} knob={46} glyph={21} />
            </span>
            <button
              type="button"
              onClick={() => actions.skip(SKIP_AHEAD * 1000)}
              aria-label={t("skipAhead", { n: SKIP_AHEAD })}
              className={cn(iconBtn, "size-9")}
            >
              <Glyph name="forward" size={25} label={SKIP_AHEAD} />
            </button>
            <button
              type="button"
              onClick={() => actions.step(1)}
              disabled={count < 2}
              aria-label={t("next")}
              className={cn(iconBtn, "size-8")}
            >
              <Glyph name="next" size={16} />
            </button>
          </div>
          <div className="justify-self-end">
            <Volume />
          </div>
        </div>
      </div>

      {count > 1 && <Queue />}
    </motion.section>
  );
}

function SoundCloudCredit() {
  const { store } = useSetsPlayer();
  const { t } = useI18n();
  const track = useStoreSelector(store, (s) => s.tracks[s.index]);
  const artist = useStoreSelector(store, (s) => s.artist);
  if (!track) return null;
  const label = artist ? `${t("openOnSoundcloud")} · ${artist.name}` : t("openOnSoundcloud");
  return (
    <a
      href={track.url}
      target="_blank"
      rel="noreferrer"
      title={label}
      aria-label={label}
      className={cn(iconBtn, "h-8 gap-1 border border-border/50 px-2.5 text-muted-foreground")}
    >
      <SoundCloudMark />
      <Glyph name="link" size={11} />
    </a>
  );
}

function SoundCloudMark() {
  // simplified SoundCloud cloud mark
  return (
    <svg width="14" height="8" viewBox="0 0 28 16" fill="currentColor" aria-hidden="true">
      <path d="M23.4 6.2c-.4 0-.8.1-1.2.2A6.3 6.3 0 0 0 15.9.6c-.6 0-1.2.1-1.7.3-.2.1-.3.2-.3.4v13.9c0 .2.2.4.4.4h9.1a4.7 4.7 0 0 0 0-9.4zM12.6 2.1c-.3 0-.6.3-.6.6v12.2c0 .3.3.6.6.6s.6-.3.6-.6V2.7c0-.3-.3-.6-.6-.6zM10.2 4c-.3 0-.6.3-.6.6v10.3c0 .3.3.6.6.6s.6-.3.6-.6V4.6c0-.3-.3-.6-.6-.6zM7.8 5.2c-.3 0-.6.3-.6.6v9.1c0 .3.3.6.6.6s.6-.3.6-.6V5.8c0-.3-.3-.6-.6-.6zM5.4 6.6c-.3 0-.6.3-.6.6v7.7c0 .3.3.6.6.6s.6-.3.6-.6V7.2c0-.3-.3-.6-.6-.6zM3 8.6c-.3 0-.6.3-.6.6v5.7c0 .3.3.6.6.6s.6-.3.6-.6V9.2c0-.3-.3-.6-.6-.6zM.6 10.2c-.3 0-.6.3-.6.6v3.2c0 .3.3.6.6.6s.6-.3.6-.6v-3.2c0-.3-.3-.6-.6-.6z" />
    </svg>
  );
}

function Volume() {
  const { store, actions } = useSetsPlayer();
  const { t } = useI18n();
  const volume = useStoreSelector(store, (s) => s.volume);
  const muted = useStoreSelector(store, (s) => s.muted);
  const level = muted ? 0 : volume;
  return (
    <div className="hidden items-center gap-1 md:flex">
      <button
        type="button"
        onClick={actions.toggleMute}
        aria-label={muted || volume === 0 ? t("unmute") : t("mute")}
        className={cn(iconBtn, "h-9 w-7")}
      >
        <Glyph name={muted || volume === 0 ? "muted" : "sound"} size={19} />
      </button>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={level}
        onChange={(e) => actions.setVolume(Number(e.target.value))}
        aria-label={t("volume")}
        className="h-1 w-12 cursor-pointer appearance-none rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary [&::-moz-range-thumb]:size-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-foreground [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-foreground"
        style={{
          background: `linear-gradient(90deg, var(--color-foreground) ${level}%, color-mix(in oklab, var(--color-foreground) 16%, transparent) ${level}%)`,
        }}
      />
    </div>
  );
}

/* ───────────────────────────────── waveform ───────────────────────────────── */

function Waveform() {
  const { store, actions } = useSetsPlayer();
  const { t } = useI18n();
  const url = useStoreSelector(store, (s) => s.tracks[s.index]?.url ?? "idle");
  const realPeaks = useStoreSelector(store, (s) => s.peaks);
  const position = useStoreSelector(store, (s) => s.position);
  const duration = useStoreSelector(store, (s) => s.duration);
  const fallback = useMemo(() => syntheticPeaks(url, WAVE_BARS), [url]);
  const peaks = realPeaks ?? fallback;
  const [scrub, setScrub] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const shown = scrub ?? position;
  const progress = duration > 0 ? Math.min(1, Math.max(0, shown / duration)) : 0;
  const ratioAt = (x: number) => {
    const r = boxRef.current?.getBoundingClientRect();
    return r && r.width ? Math.min(1, Math.max(0, (x - r.left) / r.width)) : null;
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    const r = ratioAt(e.clientX);
    if (r != null) setScrub(r * duration);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = ratioAt(e.clientX);
    if (r == null) return;
    if (e.pointerType !== "touch") setHover(r);
    if (dragging.current) setScrub(r * duration);
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) {
      const r = ratioAt(e.clientX);
      if (r != null) actions.seek(r * duration);
    }
    dragging.current = false;
    setScrub(null);
    if (e.pointerType === "touch") setHover(null);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 60000 : 10000;
    if (e.key === "ArrowRight") actions.skip(step);
    else if (e.key === "ArrowLeft") actions.skip(-step);
    else if (e.key === "Home") actions.seek(0);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };
  const tip = scrub != null ? progress : hover;

  return (
    <div>
      <div
        ref={boxRef}
        role="slider"
        tabIndex={0}
        aria-label={t("seek")}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration / 1000)}
        aria-valuenow={Math.round(shown / 1000)}
        aria-valuetext={t("timeOf", { elapsed: clock(shown), total: clock(duration) })}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={() => !dragging.current && setHover(null)}
        onKeyDown={onKey}
        className="relative flex h-11 cursor-pointer touch-none select-none items-center gap-[2px] rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary md:h-12"
      >
        {peaks.map((v, i) => {
          const fill = Math.min(1, Math.max(0, progress * peaks.length - i));
          const hovered = hover != null && fill < 1 && i < hover * peaks.length;
          const background =
            fill >= 1
              ? "var(--color-foreground)"
              : fill > 0
                ? `linear-gradient(90deg, var(--color-foreground) ${fill * 100}%, color-mix(in oklab, var(--color-foreground) 16%, transparent) ${fill * 100}%)`
                : hovered
                  ? "color-mix(in oklab, var(--color-foreground) 42%, transparent)"
                  : "color-mix(in oklab, var(--color-foreground) 16%, transparent)";
          return (
            <span
              key={i}
              className="min-w-px flex-1 rounded-full transition-[height] duration-500"
              style={{ height: `${Math.max(7, v * 100)}%`, background }}
            />
          );
        })}
        {duration > 0 && progress > 0 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-1 -top-1 -ml-px w-0.5 rounded-full bg-primary shadow-[0_0_10px_var(--glow)]"
            style={{ left: `${progress * 100}%` }}
          />
        )}
        {tip != null && duration > 0 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-7 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-1 font-mono text-[10px] leading-none text-background tabular-nums"
            style={{ left: `clamp(24px, ${tip * 100}%, calc(100% - 24px))` }}
          >
            {clock(tip * duration)}
          </span>
        )}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10.5px] tabular-nums text-muted-foreground">
        <span className="text-foreground">{clock(shown)}</span>
        <span>{duration > 0 ? `−${clock(Math.max(0, duration - shown))}` : "--:--"}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────── queue ─────────────────────────────────── */

function Queue() {
  const { store } = useSetsPlayer();
  const { t } = useI18n();
  const tracks = useStoreSelector(store, (s) => s.tracks);
  const index = useStoreSelector(store, (s) => s.index);
  const listRef = useRef<HTMLDivElement>(null);
  // keep the current set in view
  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(`[data-row="${index}"]`);
    const list = listRef.current;
    if (!row || !list) return;
    const top = row.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top + row.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTo({ top: top - list.clientHeight / 2 + row.offsetHeight / 2 });
  }, [index]);
  return (
    <div className={cn(panel, "flex min-h-[132px] flex-col p-1.5 md:min-h-[160px] md:p-2")}>
      <div className="flex shrink-0 items-center justify-between px-2 pb-2 pt-1.5 font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
        <span className="text-foreground">{t("setsTracklist")}</span>
        <span className="tabular-nums">
          {String(index + 1).padStart(2, "0")} / {String(tracks.length).padStart(2, "0")}
        </span>
      </div>
      <div
        ref={listRef}
        role="list"
        data-lenis-prevent
        className="flex min-h-0 flex-col gap-0.5 max-h-[36dvh] overflow-y-auto overscroll-contain [scrollbar-width:thin] md:max-h-[296px]"
      >
        {tracks.map((track, i) => (
          <QueueRow key={track.id} track={track} i={i} />
        ))}
      </div>
    </div>
  );
}

const QueueRow = memo(function QueueRow({ track, i }: { track: PlayerTrack; i: number }) {
  const { store, actions } = useSetsPlayer();
  const { t } = useI18n();
  const live = useStoreSelector(store, (s) => s.index === i);
  const running = useStoreSelector(
    store,
    (s) => s.index === i && (s.status === "playing" || s.status === "loading"),
  );
  const meta = [track.date, formatDuration(track.durationMs / 1000)].filter(Boolean).join(" · ");
  const activate = () => (live ? actions.toggle() : actions.playIndex(i));
  return (
    <div role="listitem" data-row={i}>
      <div
        role="button"
        tabIndex={0}
        aria-current={live ? "true" : undefined}
        aria-label={t(running ? "pauseTrack" : "playTrack", { title: track.title })}
        onClick={activate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            activate();
          }
        }}
        className={cn(
          "group flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary md:gap-3",
          live ? "bg-foreground/[0.07]" : "hover:bg-foreground/[0.04]",
        )}
      >
        <span
          className={cn(
            "flex w-5 shrink-0 justify-center font-mono text-[10.5px] tabular-nums",
            live ? "text-primary" : "text-muted-foreground",
          )}
        >
          {running ? (
            <span className="sets-eq flex h-3.5 items-end gap-[2px]" aria-hidden="true">
              <span style={{ height: 8 }} />
              <span style={{ height: 8 }} />
              <span style={{ height: 8 }} />
            </span>
          ) : (
            String(i + 1).padStart(2, "0")
          )}
        </span>
        <Cover track={track} className="size-9 md:size-10" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium uppercase tracking-[.02em] text-foreground">
            {track.title}
          </span>
          {meta && (
            <span className="block truncate font-mono text-[10px] uppercase tracking-[.1em] text-muted-foreground">
              {meta}
            </span>
          )}
        </span>
        <a
          href={track.url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={`${t("openOnSoundcloud")}: ${track.title}`}
          title={t("openOnSoundcloud")}
          className={cn(
            iconBtn,
            "size-7 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
            live && "opacity-100",
          )}
        >
          <Glyph name="link" size={14} />
        </a>
        <span
          aria-hidden="true"
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
            live
              ? "border-foreground bg-foreground text-background"
              : "border-border/70 text-foreground",
          )}
        >
          <Glyph name={running ? "pause" : "play"} size={12} />
        </span>
      </div>
    </div>
  );
});

/* ─────────────────────────────── mini player ─────────────────────────────── */

function MiniPlayer() {
  const { store, actions } = useSetsPlayer();
  const { t } = useI18n();
  const track = useStoreSelector(store, (s) => s.tracks[s.index]);
  const status = useStoreSelector(store, (s) => s.status);
  const position = useStoreSelector(store, (s) => s.position);
  const duration = useStoreSelector(store, (s) => s.duration);
  const label = useStatusLabel(status, position > 0);
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const running = status === "playing";
  return (
    <motion.section
      role="region"
      aria-label={t("setsPlayer")}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ transformOrigin: "bottom right" }}
      className={cn(
        "pointer-events-auto relative flex w-full items-center gap-2.5 overflow-hidden rounded-full py-1.5 pl-1.5 pr-1.5 md:w-[340px]",
        glass,
      )}
    >
      <span className="relative flex">
        <Cover
          track={track}
          round
          className="sets-anim size-10 ring-1 ring-border/60"
          style={{
            animation: "sets-spin 6s linear infinite",
            animationPlayState: running ? "running" : "paused",
          }}
        />
        {/* record hole */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/40 bg-background"
        />
      </span>
      <button
        type="button"
        onClick={() => actions.setMinimized(false)}
        className="min-w-0 flex-1 text-left outline-none focus-visible:outline-2 focus-visible:outline-primary"
        aria-label={t("expandPlayer")}
      >
        <span className="block truncate text-[12.5px] font-medium uppercase tracking-[.02em] text-foreground">
          {track?.title}
        </span>
        <span className="block truncate font-mono text-[9.5px] uppercase tracking-[.14em] text-muted-foreground tabular-nums">
          <span className={running ? "text-primary" : undefined}>{label}</span>
          {" · "}
          {clock(position)}
          {duration > 0 ? ` / ${clock(duration)}` : ""}
        </span>
      </button>
      <PlayRing size={40} knob={32} glyph={14} />
      <button
        type="button"
        onClick={() => actions.setMinimized(false)}
        aria-label={t("expandPlayer")}
        title={t("expandPlayer")}
        className={cn(iconBtn, "size-8 text-muted-foreground")}
      >
        <ChevronUp className="size-4" />
      </button>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-primary"
        style={{ width: `${progress * 100}%` }}
      />
    </motion.section>
  );
}
