import { ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Glyph } from "@/components/sets/player-glyphs";
import { SetsPlayer } from "@/components/sets/SetsPlayer";
import { SetsPlayerProvider } from "@/components/sets/SetsPlayerProvider";
import { clock, syntheticPeaks, type PlayerTrack } from "@/components/sets/player-store";
import { getPublicMusic, getSiteSettings } from "@/lib/public.functions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const BARS = 48;
const glass =
  "border border-border/50 bg-background/40 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.65)] backdrop-blur-sm";
const panel = "rounded-lg border border-border/40 bg-background/35";
const iconBtn =
  "inline-flex shrink-0 items-center justify-center rounded-full text-foreground/75 transition-[color,background-color,transform,opacity] duration-150 hover:text-foreground active:scale-90 disabled:pointer-events-none disabled:opacity-30";

/** Global player with the Sets design. Opens minimized and starts if tracks exist. */
export function AudioPlayer() {
  const onSets = useRouterState({ select: (s) => s.location.pathname === "/sets" });
  return onSets ? null : <GlobalPlayerChooser />;
}

function isSoundcloud(value: string) {
  try {
    return /(^|\.)soundcloud\.com$/i.test(new URL(value).hostname);
  } catch {
    return false;
  }
}

function GlobalPlayerChooser() {
  const music = useQuery({ queryKey: ["public-music"], queryFn: () => getPublicMusic() });
  const settings = useQuery({ queryKey: ["site-settings"], queryFn: () => getSiteSettings() });
  const tracks = music.data?.tracks ?? [];
  if (!tracks.length || settings.data?.player_enabled === false) return null;
  if (isSoundcloud(tracks[0]?.audio_url ?? "")) {
    const soundcloudTracks: PlayerTrack[] = tracks
      .filter((track) => isSoundcloud(track.audio_url))
      .map((track) => ({
        id: track.id,
        title: track.title,
        url: track.audio_url,
        cover: track.cover_url,
        date: "",
        durationMs: 0,
      }));
    return (
      <SetsPlayerProvider
        tracks={soundcloudTracks}
        initialMinimized
        shuffle={settings.data?.player_shuffle ?? false}
        storageKey="jula-global-player-min"
      >
        <SetsPlayer />
      </SetsPlayerProvider>
    );
  }
  return <HeroPlayer />;
}

function HeroPlayer() {
  const { t } = useI18n();
  const music = useQuery({ queryKey: ["public-music"], queryFn: () => getPublicMusic() });
  const settings = useQuery({ queryKey: ["site-settings"], queryFn: () => getSiteSettings() });
  const tracks = music.data?.tracks ?? [];
  const audio = useRef<HTMLAudioElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [index, setIndex] = useState(0);
  const [minimized, setMinimized] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const started = useRef(false);

  useEffect(() => setHost(document.body), []);

  const current = tracks[index];
  useEffect(() => {
    const el = audio.current;
    if (!el || !current) return;
    if (playing) void el.play().catch(() => setPlaying(false));
    else el.pause();
  }, [playing, current]);

  useEffect(() => {
    if (started.current || !tracks.length || settings.data?.player_enabled === false) return;
    started.current = true;
    if (settings.data?.player_shuffle) setIndex(Math.floor(Math.random() * tracks.length));
    setPlaying(true);
  }, [tracks.length, settings.data?.player_enabled, settings.data?.player_shuffle]);

  if (!host || !tracks.length || settings.data?.player_enabled === false) return null;

  const move = (step: number) => {
    setIndex((value) =>
      settings.data?.player_shuffle && tracks.length > 1
        ? (value + 1 + Math.floor(Math.random() * (tracks.length - 1))) % tracks.length
        : (value + step + tracks.length) % tracks.length,
    );
    setPlaying(true);
  };

  return createPortal(
    <div className="pointer-events-none fixed inset-x-2 bottom-[max(env(safe-area-inset-bottom),0.5rem)] z-[45] flex flex-col items-end md:inset-x-auto md:bottom-5 md:right-5 md:w-[400px]">
      <audio
        ref={audio}
        src={current?.audio_url}
        autoPlay
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime * 1000)}
        onDurationChange={(e) => setDuration((e.currentTarget.duration || 0) * 1000)}
        onEnded={() => move(1)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <AnimatePresence mode="wait" initial={false}>
        {minimized ? (
          <Mini
            key="mini"
            title={current?.title ?? ""}
            cover={current?.cover_url}
            playing={playing}
            position={position}
            duration={duration}
            onToggle={() => setPlaying((value) => !value)}
            onExpand={() => setMinimized(false)}
            label={playing ? t("playerPlaying") : t("playerPaused")}
          />
        ) : (
          <Full
            key="full"
            title={current?.title ?? ""}
            artist={current?.artist ?? "Tulio"}
            cover={current?.cover_url}
            playing={playing}
            position={position}
            duration={duration}
            tracks={tracks.map((track) => ({
              id: track.id,
              title: track.title,
              cover: track.cover_url,
            }))}
            index={index}
            onToggle={() => setPlaying((value) => !value)}
            onMinimize={() => setMinimized(true)}
            onStep={move}
            onSeek={(ms) => {
              if (audio.current) audio.current.currentTime = ms / 1000;
              setPosition(ms);
            }}
            onPlayIndex={(next) => {
              setIndex(next);
              setPlaying(true);
            }}
            label={playing ? t("playerPlaying") : t("playerPaused")}
          />
        )}
      </AnimatePresence>
    </div>,
    host,
  );
}

function Cover({
  src,
  round,
  className,
}: {
  src?: string | null | undefined;
  round?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-accent to-primary/70",
        round ? "rounded-full" : "rounded-md",
        className,
      )}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <Glyph name="wave" size={16} />
      )}
    </span>
  );
}

function PlayButton({
  playing,
  onClick,
  size = 40,
}: {
  playing: boolean;
  onClick: () => void;
  size?: number;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={playing ? t("pause") : t("play")}
      className="inline-flex items-center justify-center rounded-full bg-foreground text-background"
      style={{ width: size * 0.8, height: size * 0.8 }}
    >
      <Glyph name={playing ? "pause" : "play"} size={size * 0.35} />
    </button>
  );
}

function Mini(props: {
  title: string;
  cover?: string | null | undefined;
  playing: boolean;
  position: number;
  duration: number;
  label: string;
  onToggle: () => void;
  onExpand: () => void;
}) {
  const { t } = useI18n();
  const progress = props.duration > 0 ? Math.min(1, props.position / props.duration) : 0;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className={cn(
        "pointer-events-auto relative flex w-full items-center gap-2.5 overflow-hidden rounded-full py-1.5 pl-1.5 pr-1.5 md:w-[340px]",
        glass,
      )}
    >
      <Cover src={props.cover} round className="size-10" />
      <button type="button" onClick={props.onExpand} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[12.5px] font-medium uppercase tracking-[.02em]">
          {props.title}
        </span>
        <span className="block truncate font-mono text-[9.5px] uppercase tracking-[.14em] text-muted-foreground">
          <span className={props.playing ? "text-primary" : undefined}>{props.label}</span>
          {" · "}
          {clock(props.position)}
          {props.duration > 0 ? ` / ${clock(props.duration)}` : ""}
        </span>
      </button>
      <PlayButton playing={props.playing} onClick={props.onToggle} />
      <button
        type="button"
        onClick={props.onExpand}
        aria-label={t("expandPlayer")}
        className={cn(iconBtn, "size-8")}
      >
        <ChevronUp className="size-4" />
      </button>
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-primary"
        style={{ width: `${progress * 100}%` }}
      />
    </motion.section>
  );
}

function Full(props: {
  title: string;
  artist: string;
  cover?: string | null | undefined;
  playing: boolean;
  position: number;
  duration: number;
  label: string;
  tracks: { id: string; title: string; cover: string | null }[];
  index: number;
  onToggle: () => void;
  onMinimize: () => void;
  onStep: (step: number) => void;
  onSeek: (ms: number) => void;
  onPlayIndex: (index: number) => void;
}) {
  const { t } = useI18n();
  const peaks = useMemo(() => syntheticPeaks(props.title, BARS), [props.title]);
  const progress = props.duration > 0 ? Math.min(1, props.position / props.duration) : 0;
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className={cn(
        "pointer-events-auto flex max-h-[70dvh] w-full flex-col gap-2 rounded-xl p-2",
        glass,
      )}
    >
      <div className={cn(panel, "flex flex-col gap-4 p-4")}>
        <div className="flex items-center gap-3.5">
          <Cover src={props.cover} className="size-16" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9.5px] uppercase tracking-[.16em] text-primary">
              {props.label}
            </p>
            <p className="mt-1 line-clamp-2 text-[15px] uppercase leading-tight">{props.title}</p>
            <p className="font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">
              {props.artist}
            </p>
          </div>
          <button
            type="button"
            onClick={props.onMinimize}
            aria-label={t("minimizePlayer")}
            className={cn(iconBtn, "size-8 border border-border/50")}
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
        <button
          type="button"
          className="flex h-11 items-end gap-[2px]"
          onClick={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            props.onSeek(((e.clientX - box.left) / box.width) * props.duration);
          }}
        >
          {peaks.map((value, i) => (
            <span
              key={i}
              className="min-w-px flex-1 rounded-full bg-foreground/20"
              style={{
                height: `${Math.max(8, value * 100)}%`,
                background: i / peaks.length < progress ? "var(--color-foreground)" : undefined,
              }}
            />
          ))}
        </button>
        <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>{clock(props.position)}</span>
          <span>{props.duration > 0 ? clock(props.duration) : "--:--"}</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            className={iconBtn}
            onClick={() => props.onStep(-1)}
            aria-label={t("previous")}
          >
            <Glyph name="prev" size={16} />
          </button>
          <PlayButton playing={props.playing} onClick={props.onToggle} size={56} />
          <button
            type="button"
            className={iconBtn}
            onClick={() => props.onStep(1)}
            aria-label={t("next")}
          >
            <Glyph name="next" size={16} />
          </button>
        </div>
      </div>
      {props.tracks.length > 1 && (
        <div className={cn(panel, "max-h-48 overflow-y-auto p-2")}>
          {props.tracks.map((track, i) => (
            <button
              key={track.id}
              type="button"
              onClick={() => props.onPlayIndex(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left",
                i === props.index && "bg-foreground/10",
              )}
            >
              <Cover src={track.cover} className="size-9" />
              <span className="truncate text-xs uppercase">{track.title}</span>
            </button>
          ))}
        </div>
      )}
    </motion.section>
  );
}
