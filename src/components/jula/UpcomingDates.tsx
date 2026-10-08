/**
 * "Próximas datas" popup.
 *
 * The list is a faithful re-implementation of the hover-reveal list from the
 * reference Framer component (https://dynamic-friday-775371.framer.app/):
 * - #171717 surface, monospace uppercase 13px rows, letter-spacing .06em, 16px/24px padding
 * - a white highlight bar that glides to the hovered row (top/height/opacity,
 *   0.2475s easeOut) while the row text turns black (color 0.275s ease)
 * - the hovered item's image revealed from the centre with a clip-path
 *   (inset(50% round 4px) -> inset(0% round 4px), 0.55s cubic-bezier(.22,1,.36,1)),
 *   large preview at left 35% / vertically centred (full opacity, no blend mode),
 *   gently following the cursor (±18px, spring stiffness 118, damping 22, mass .6)
 * - prefers-reduced-motion: plain opacity fades, no cursor follow
 * Touch screens (no hover) get inline thumbnails and tap-to-highlight instead.
 *
 * Rendered through a portal on document.body: route content sits inside the
 * `.page-enter` transform wrapper, which breaks `position: fixed`.
 */
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { TulioWordmark } from "@/components/tulio/TulioWordmark";
import { SwapText } from "@/components/jula/SwapText";
import { useI18n, type Locale } from "@/lib/i18n";
import { getUpcomingDates, type UpcomingDate } from "@/lib/upcoming-dates.functions";

// ------------------------------------------------------------------ open state

let isOpen = false;
const listeners = new Set<() => void>();
function setOpenState(next: boolean) {
  if (isOpen === next) return;
  isOpen = next;
  listeners.forEach((l) => l());
}
export const openUpcomingDates = () => setOpenState(true);
const closeUpcomingDates = () => setOpenState(false);
function useUpcomingDatesOpen() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => isOpen,
    () => false,
  );
}

const DEEP_LINK_HASH = "#proximas-datas";
function hasDeepLink() {
  return (
    window.location.hash === DEEP_LINK_HASH ||
    new URLSearchParams(window.location.search).get("datas") === "1"
  );
}

// ------------------------------------------------------------------ constants (reference props)

const REVEAL_SPEED = 0.55; // revealSpeed
const FOLLOW_TIGHTNESS = 0.4; // followTightness
const ROW_SPACING = 0.4; // rowSpacing -> 12 + 0.4 * 10 = 16px vertical padding
const IMAGE_SCALE = 1.45; // imageScale — larger hover preview
const EASE_REVEAL = [0.22, 1, 0.36, 1] as const;
const SPRING = { stiffness: 30 + FOLLOW_TIGHTNESS * 220, damping: 22, mass: 0.6 };
const ROW_PAD_Y = 12 + ROW_SPACING * 10;
/** The SiteHeader bar's material, verbatim (keep in sync with SiteHeader.tsx). */
const MENU_GLASS =
  "rounded-xl border border-border/50 bg-background/40 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.65)] backdrop-blur-sm";
const HIGHLIGHT = "#ffffff";
const ACTIVE_TEXT = "#000000";
const INACTIVE_TEXT = "#ffffff";

const localeTags: Record<Locale, string> = {
  pt: "pt-BR",
  es: "es-ES",
  en: "en-GB",
  fr: "fr-FR",
  de: "de-DE",
  nl: "nl-NL",
};

function formatEventDate(item: UpcomingDate, locale: Locale) {
  const [y, m, d] = item.event_date.split("-").map(Number);
  const [hh, mm] = (item.event_time ?? "").split(":").map(Number);
  const hasTime = item.event_time != null && Number.isFinite(hh);
  // Wall-clock date/time as announced (no timezone conversion).
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1, hasTime ? hh : 12, hasTime ? (mm ?? 0) : 0);
  const tag = localeTags[locale];
  const day = date.toLocaleDateString(tag, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return hasTime
    ? `${day} · ${date.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" })}`
    : day;
}

const place = (item: UpcomingDate) => [item.venue, item.city].filter(Boolean).join(" · ");

function useCanHover() {
  const [canHover, setCanHover] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCanHover(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return canHover;
}

// ------------------------------------------------------------------ nav trigger

const MOBILE_LINK =
  "group block py-3 text-left font-display text-4xl font-black uppercase leading-none tracking-tight text-foreground/85 transition-all duration-500 hover:text-foreground";

/** Nav entry that opens the popup (desktop inline nav or mobile fullscreen menu). */
export function UpcomingDatesNavItem({
  variant,
  index = 0,
  menuOpen = false,
  labelClassName,
  onSelect,
}: {
  variant: "desktop" | "mobile" | "menu";
  index?: number;
  menuOpen?: boolean;
  labelClassName?: string;
  onSelect?: () => void;
}) {
  const { t } = useI18n();
  const open = useUpcomingDatesOpen();
  const label = t("upcomingDates");
  const onClick = () => {
    onSelect?.();
    openUpcomingDates();
  };
  if (variant === "menu")
    return (
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-baseline gap-4 bg-transparent p-0 text-left text-white"
      >
        <span className="font-mono text-[13px] tracking-[0.16em] text-white/45 md:text-[11px]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className={labelClassName}>{label}</span>
      </button>
    );
  if (variant === "desktop")
    return (
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-glitch={label}
        className={`nav-pill-link relative z-[1] whitespace-nowrap px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] ${open ? "text-white" : "text-white/55"}`}
      >
        <SwapText>{label}</SwapText>
      </button>
    );
  // Mirrors the mobile menu links (stagger + swap hover) in SiteHeader.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className={MOBILE_LINK}
      style={{
        transitionDelay: menuOpen ? `${120 + index * 80}ms` : "0ms",
        opacity: menuOpen ? 1 : 0,
        transform: menuOpen ? "translateY(0)" : "translateY(28px)",
      }}
    >
      <span className="block overflow-hidden">
        <span className="block transition-transform duration-500 group-hover:translate-y-[-105%]">
          {label}
        </span>
      </span>
      <span className="block overflow-hidden">
        <span className="block translate-y-[105%] text-foreground transition-transform duration-500 group-hover:translate-y-0">
          {label}
        </span>
      </span>
    </button>
  );
}

// ------------------------------------------------------------------ popup

/** Mount once (SiteHeader). Handles deep links (?datas=1 / #proximas-datas). */
export function UpcomingDatesDialog() {
  const open = useUpcomingDatesOpen();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (hasDeepLink()) openUpcomingDates();
    const onHash = () => {
      if (window.location.hash === DEEP_LINK_HASH) openUpcomingDates();
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Clear the deep link when closing so a reload doesn't reopen it.
  useEffect(() => {
    if (open || !mounted || !hasDeepLink()) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("datas");
    if (url.hash === DEEP_LINK_HASH) url.hash = "";
    window.history.replaceState(window.history.state, "", url.toString());
  }, [open, mounted]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>{open && <Popup key="dates" />}</AnimatePresence>,
    document.body,
  );
}

function Popup() {
  const { t, locale } = useI18n();
  const reduced = useReducedMotion() ?? false;
  const canHover = useCanHover();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const query = useQuery({
    queryKey: ["upcoming-dates"],
    queryFn: () => getUpcomingDates(),
    staleTime: 60_000,
    retry: 1,
  });

  // Scroll lock, Esc, focus trap + restore.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    const prevPadding = html.style.paddingRight;
    const scrollbar = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    if (scrollbar > 0) html.style.paddingRight = `${scrollbar}px`;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeUpcomingDates();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = [
        ...panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (
        e.shiftKey &&
        (document.activeElement === first || !panelRef.current.contains(document.activeElement))
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
      html.style.paddingRight = prevPadding;
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  const items = query.data ?? [];
  const panelTransition = reduced
    ? { duration: 0.2 }
    : { duration: REVEAL_SPEED, ease: EASE_REVEAL };

  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[80] flex items-center justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-[max(env(safe-area-inset-top),0.75rem)] md:p-10"
      data-lenis-prevent
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0.15 : 0.35, ease: "easeOut" }}
        onClick={closeUpcomingDates}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upcoming-dates-title"
        // Same glass as the floating menu bar (SiteHeader): translucent page color, blur, hairline
        // border, soft drop shadow, rounded-xl.
        className={`relative flex max-h-full w-full max-w-[1200px] flex-col overflow-hidden md:max-h-[min(86dvh,820px)] ${MENU_GLASS}`}
        style={{ color: INACTIVE_TEXT }}
        initial={
          reduced ? { opacity: 0 } : { clipPath: "inset(50% 0% 50% 0% round 6px)", opacity: 1 }
        }
        animate={
          reduced ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0% round 6px)", opacity: 1 }
        }
        exit={
          reduced
            ? { opacity: 0 }
            : {
                clipPath: "inset(50% 0% 50% 0% round 6px)",
                opacity: 0,
                transition: { duration: REVEAL_SPEED * 0.8, ease: EASE_REVEAL },
              }
        }
        transition={panelTransition}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border/50 px-6 py-4 font-mono text-[13px] uppercase tracking-[.06em]">
          <h2
            id="upcoming-dates-title"
            className="font-mono text-[13px] font-normal tracking-[.06em]"
          >
            {t("upcomingDates")}
            {items.length > 0 && (
              <span className="ml-3 opacity-60">({String(items.length).padStart(2, "0")})</span>
            )}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={closeUpcomingDates}
            aria-label={t("close")}
            className="-mr-2 grid size-9 place-items-center text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
          >
            <X className="size-5" />
          </button>
        </header>
        {query.isPending ? (
          <StatusRows label={t("loadingDates")} />
        ) : query.isError ? (
          <div className="px-6 py-14 font-mono text-[13px] uppercase tracking-[.06em]">
            <p className="opacity-60">{t("datesError")}</p>
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="mt-5 border border-white/70 px-3 py-1.5 text-[11px] uppercase tracking-[.06em] transition-colors hover:bg-white hover:text-black"
            >
              {t("tryAgain")}
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="px-6 py-14 font-mono text-[13px] uppercase tracking-[.06em] opacity-60">
            {t("noUpcomingDates")}
          </p>
        ) : (
          <HoverRevealList
            items={items}
            canHover={canHover}
            reduced={reduced}
            locale={locale}
            ticketsLabel={t("tickets")}
            ticketsFor={(name) => t("ticketsFor", { name })}
            overlayRef={overlayRef}
          />
        )}
      </motion.div>
    </div>
  );
}

function StatusRows({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="font-mono text-[13px] uppercase tracking-[.06em]"
    >
      <span className="sr-only">{label}</span>
      {[0.55, 0.4, 0.5].map((w, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 px-6"
          style={{ paddingBlock: ROW_PAD_Y }}
        >
          <span className="h-3 animate-pulse bg-white/10" style={{ width: `${w * 40}%` }} />
          <span className="h-3 w-24 animate-pulse bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function Fallback() {
  return (
    <div
      className="grid size-full place-items-center"
      style={{ background: "#0c0c0c" }}
    >
      <TulioWordmark className="text-4xl text-white" />
    </div>
  );
}

function HoverRevealList({
  items,
  canHover,
  reduced,
  locale,
  ticketsLabel,
  ticketsFor,
  overlayRef,
}: {
  items: UpcomingDate[];
  canHover: boolean;
  reduced: boolean;
  locale: Locale;
  ticketsLabel: string;
  ticketsFor: (name: string) => string;
  overlayRef: React.RefObject<HTMLDivElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [bar, setBar] = useState({ top: 0, height: 0 });
  const [previewAnchor, setPreviewAnchor] = useState({ x: 0, y: 0 });
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, SPRING);
  const y = useSpring(my, SPRING);

  const activate = useCallback((i: number) => {
    const row = rowsRef.current[i];
    if (row) setBar({ top: row.offsetTop, height: row.offsetHeight });
    setActive(i);
  }, []);
  const reset = useCallback(() => {
    setActive(null);
    mx.set(0);
    my.set(0);
  }, [mx, my]);

  const onMouseMove = (e: React.MouseEvent) => {
    if (!canHover || reduced || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 36);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 36);
  };

  const measurePreviewAnchor = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPreviewAnchor({ x: r.left + r.width * 0.35, y: r.top + r.height / 2 });
  }, []);

  useLayoutEffect(() => {
    measurePreviewAnchor();
  }, [active, measurePreviewAnchor]);

  useEffect(() => {
    if (active === null) return;
    const scrollEl = scrollRef.current;
    measurePreviewAnchor();
    scrollEl?.addEventListener("scroll", measurePreviewAnchor, { passive: true });
    window.addEventListener("resize", measurePreviewAnchor);
    return () => {
      scrollEl?.removeEventListener("scroll", measurePreviewAnchor);
      window.removeEventListener("resize", measurePreviewAnchor);
    };
  }, [active, measurePreviewAnchor]);

  const activeItem = active === null ? null : items[active];
  const imgW = `${19 * IMAGE_SCALE}rem`;
  const imgH = `${22 * IMAGE_SCALE}rem`;
  const overlayEl = overlayRef.current;

  const previewLayer =
    canHover && overlayEl && activeItem ? (
      createPortal(
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[85]">
          <AnimatePresence>
            <motion.div
              key={active}
              initial={
                reduced ? { opacity: 0 } : { clipPath: "inset(50% round 4px)", opacity: 1 }
              }
              animate={reduced ? { opacity: 1 } : { clipPath: "inset(0% round 4px)", opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { clipPath: "inset(50% round 4px)", opacity: 1 }}
              transition={{ duration: Math.max(0.1, REVEAL_SPEED), ease: EASE_REVEAL }}
              className="fixed -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-md shadow-[0_24px_80px_-20px_rgb(0_0_0/0.85)] ring-1 ring-white/15"
              style={{
                left: previewAnchor.x,
                top: previewAnchor.y,
                width: imgW,
                height: imgH,
                x: reduced ? 0 : x,
                y: reduced ? 0 : y,
              }}
            >
              {activeItem.image ? (
                <img
                  src={activeItem.image}
                  alt=""
                  className="block size-full object-cover opacity-100"
                />
              ) : (
                <Fallback />
              )}
            </motion.div>
          </AnimatePresence>
        </div>,
        overlayEl,
      )
    ) : null;

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 flex-1 md:min-h-[24rem]"
      onMouseMove={onMouseMove}
      onMouseLeave={canHover ? reset : undefined}
    >
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto overscroll-contain"
        data-lenis-prevent
      >
        <div className="relative font-mono text-[13px] uppercase tracking-[.06em]">
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 z-[1]"
            style={{ backgroundColor: HIGHLIGHT }}
            initial={false}
            animate={{ top: bar.top, height: bar.height, opacity: active === null ? 0 : 1 }}
            transition={{ duration: Math.max(0.1, REVEAL_SPEED) * 0.45, ease: "easeOut" }}
          />
          <ul className="relative z-[2]">
            {items.map((item, i) => {
              const isActive = active === i;
              const where = place(item);
              return (
                <motion.li
                  key={item.id}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: reduced ? 0 : 0.22 + i * 0.045,
                    duration: 0.45,
                    ease: EASE_REVEAL,
                  }}
                >
                  <div
                    ref={(el) => {
                      rowsRef.current[i] = el;
                    }}
                    onMouseEnter={canHover ? () => activate(i) : undefined}
                    onFocus={() => activate(i)}
                    onClick={() => {
                      if (item.ticket_url) {
                        window.open(item.ticket_url, "_blank", "noopener,noreferrer");
                        return;
                      }
                      if (!canHover) {
                        if (isActive) setActive(null);
                        else activate(i);
                      }
                    }}
                    className={`flex cursor-pointer items-center gap-4 px-6 ${canHover ? "justify-between" : ""}`}
                    style={{
                      paddingBlock: canHover ? ROW_PAD_Y : 12,
                      color: isActive ? ACTIVE_TEXT : INACTIVE_TEXT,
                      transition: `color ${Math.max(0.1, REVEAL_SPEED) * 0.5}s ease`,
                    }}
                  >
                    {canHover ? (
                      <>
                        <span className="min-w-[22%]">
                          {item.name}
                          {item.description && (
                            <span className="mt-1 block text-[10px] normal-case tracking-normal opacity-70">
                              {item.description}
                            </span>
                          )}
                        </span>
                        <span className="min-w-[18%]">{formatEventDate(item, locale)}</span>
                        <span className="flex-1 text-right opacity-60">{where}</span>
                      </>
                    ) : (
                      <>
                        <span className="h-16 w-14 shrink-0 overflow-hidden rounded-[4px]">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt=""
                              loading="lazy"
                              className="size-full object-cover"
                            />
                          ) : (
                            <Fallback />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 leading-snug">
                          <span className="block">{item.name}</span>
                          {item.description && (
                            <span className="mt-1 block text-[11px] normal-case tracking-normal opacity-70">
                              {item.description}
                            </span>
                          )}
                          <span className="mt-1 block text-[11px]">
                            {formatEventDate(item, locale)}
                          </span>
                          {where && (
                            <span className="mt-0.5 block text-[11px] opacity-60">{where}</span>
                          )}
                          {item.ticket_url && (
                            <span className="mt-3 block">
                              <TicketLink
                                href={item.ticket_url}
                                label={ticketsLabel}
                                ariaLabel={ticketsFor(item.name)}
                                inverted={isActive}
                                compact
                              />
                            </span>
                          )}
                        </span>
                      </>
                    )}
                    {!canHover ? null : item.ticket_url ? (
                      <TicketLink
                        href={item.ticket_url}
                        label={ticketsLabel}
                        ariaLabel={ticketsFor(item.name)}
                        inverted={isActive}
                      />
                    ) : (
                      <span className="w-[7.5rem] shrink-0" aria-hidden="true" />
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </div>
      {previewLayer}
    </div>
  );
}

function TicketLink({
  href,
  label,
  ariaLabel,
  inverted,
  compact = false,
}: {
  href: string;
  label: string;
  ariaLabel: string;
  inverted: boolean;
  compact?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
      className={`relative z-[4] inline-flex ${compact ? "" : "w-[7.5rem]"} shrink-0 items-center justify-center gap-1.5 border px-3 py-1.5 text-[11px] uppercase tracking-[.06em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current ${
        inverted
          ? "border-black text-black hover:bg-black hover:text-white"
          : "border-white/70 text-white hover:border-white hover:bg-white hover:text-black"
      }`}
    >
      {label}
      <ArrowUpRight className="size-3.5" />
    </a>
  );
}
