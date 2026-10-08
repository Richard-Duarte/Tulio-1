import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { LanguageSelector } from "@/components/jula/LanguageSelector";
import { UpcomingDatesDialog, UpcomingDatesNavItem } from "@/components/jula/UpcomingDates";
import { TulioWordmark } from "@/components/tulio/TulioWordmark";
import { useI18n } from "@/lib/i18n";
import { setMenuOpen } from "@/lib/menu-open";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

type MenuMode = "closed" | "overlay" | "bar";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Opening section still covers the top of the viewport. */
function isOnOpeningSection() {
  const section = document.querySelector<HTMLElement>('section[aria-label="Abertura"]');
  if (!section) return false;
  const rect = section.getBoundingClientRect();
  // Top of the opening section is still at the top of the screen (small offset from the fixed bar).
  return rect.top <= 48 && rect.bottom > Math.min(160, window.innerHeight * 0.35);
}

const OVERLAY_LABEL =
  "nc-display text-[clamp(3.35rem,13vw,4.75rem)] leading-[0.9] md:text-[clamp(2.4rem,7vw,5.5rem)] md:leading-[0.95]";
const BAR_LABEL = "nc-display text-[clamp(1.35rem,4.2vw,2rem)] leading-none";

export function SiteHeader() {
  const [mode, setMode] = useState<MenuMode>("closed");
  const [hovered, setHovered] = useState<number | null>(null);
  const [buttonHover, setButtonHover] = useState(false);
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const toggleRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState("calc(100% - 44px) 36px");

  const links = [
    ["/", t("home") ?? "Início"],
    ["/galeria", t("gallery")],
    ["/sets", t("sets")],
    ["/live-sets", t("liveSets")],
    ["/releases", t("releases")],
    ["/presskit", t("presskit")],
  ] as const;

  const open = mode !== "closed";
  const overlay = mode === "overlay";

  useEffect(() => {
    setMode("closed");
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(overlay);
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMode("closed");
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    if (overlay) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      setMenuOpen(false);
    };
  }, [open, overlay]);

  const duration = reduced ? 0.2 : 0.8;

  useEffect(() => {
    const node = overlayRef.current;
    if (!overlay || !node || reduced) return;
    const animation = node.animate(
      [{ clipPath: `circle(0% at ${origin})` }, { clipPath: `circle(150% at ${origin})` }],
      { duration: duration * 1000, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" },
    );
    return () => animation.cancel();
  }, [overlay, origin, reduced, duration]);

  const close = () => setMode("closed");

  const renderItems = (labelClass: string) =>
    links.map(([to, label], index) => {
      const dimmed = hovered !== null && hovered !== index;
      return (
        <motion.li
          key={to}
          initial={reduced ? false : { opacity: 0, y: 28, filter: "blur(12px)" }}
          animate={{ opacity: dimmed ? 0.32 : 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration, ease: EASE_OUT, delay: reduced ? 0 : 0.24 + index * 0.07 }}
        >
          <Link
            to={to}
            onClick={close}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setHovered(index);
            }}
            onPointerLeave={() => setHovered((current) => (current === index ? null : current))}
            className="inline-flex items-baseline gap-4 text-white no-underline"
          >
            <span className="font-mono text-[13px] tracking-[0.16em] text-white/45 md:text-[11px]">{pad(index + 1)}</span>
            <span className={labelClass}>{label}</span>
          </Link>
        </motion.li>
      );
    });

  const datesIndex = links.length;

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-3 pt-[max(env(safe-area-inset-top),0.75rem)] md:px-6">
        <div
          className={`pointer-events-auto flex w-full max-w-[1200px] text-[16px] text-white md:text-[13px] ${
            mode === "bar"
              ? "max-h-[calc(100dvh-1.5rem)] flex-col overflow-y-auto py-3.5 pr-5 pl-5 md:py-4 md:pr-8 md:pl-8"
              : "items-center justify-between py-3.5 pr-7 pl-8 [clip-path:polygon(22px_0,calc(100%-22px)_0,100%_50%,calc(100%-22px)_100%,22px_100%,0_50%)] md:py-[5px] md:pr-7 md:pl-[34px] md:[clip-path:polygon(16px_0,calc(100%-16px)_0,100%_50%,calc(100%-16px)_100%,16px_100%,0_50%)]"
          }`}
          style={{
            color: "#fafafa",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="flex w-full items-center justify-between gap-3">
            <Link to="/" aria-label="Tulio — início" className="inline-flex shrink-0 items-center text-[18px] no-underline md:text-[13px]">
              <TulioWordmark className="text-[18px] md:text-[13px]" />
            </Link>
            <div className="flex shrink-0 items-center gap-3 md:gap-5">
              <LanguageSelector />
              <button
                ref={toggleRef}
                type="button"
                className="flex items-center gap-3 bg-transparent p-0 text-inherit"
                aria-expanded={open}
                aria-label={open ? t("closeMenu") : t("openMenu")}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") setButtonHover(true);
                }}
                onPointerLeave={() => setButtonHover(false)}
                onClick={() => {
                  if (open) {
                    setMode("closed");
                    return;
                  }
                  const button = toggleRef.current;
                  if (button) {
                    const rect = button.getBoundingClientRect();
                    setOrigin(`${Math.round(rect.right - 20)}px ${Math.round(rect.top + rect.height / 2)}px`);
                  }
                  setMode(isOnOpeningSection() ? "overlay" : "bar");
                }}
              >
                <span className="grid justify-items-end overflow-hidden py-1 text-[16px] leading-none tracking-[0.02em] md:py-[3px] md:text-[12px]" aria-hidden>
                  <motion.span
                    className="col-start-1 row-start-1"
                    animate={{ y: open ? -22 : 0, opacity: open ? 0 : buttonHover || open ? 1 : 0.7 }}
                    transition={{ duration: reduced ? 0 : 0.52, ease: [0.65, 0, 0.35, 1] }}
                  >
                    Menu
                  </motion.span>
                  <motion.span
                    className="col-start-1 row-start-1"
                    animate={{ y: open ? 0 : 22, opacity: open ? 1 : 0 }}
                    transition={{ duration: reduced ? 0 : 0.52, ease: [0.65, 0, 0.35, 1] }}
                  >
                    Close
                  </motion.span>
                </span>
              </button>
            </div>
          </div>
          {mode === "bar" ? (
            <nav aria-label="Menu" className="pt-4 pb-4">
              <ul className="flex flex-col gap-2">
                {renderItems(BAR_LABEL)}
                <motion.li
                  initial={reduced ? false : { opacity: 0, y: 28, filter: "blur(12px)" }}
                  animate={{ opacity: hovered !== null && hovered !== datesIndex ? 0.32 : 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration, ease: EASE_OUT, delay: reduced ? 0 : 0.24 + datesIndex * 0.07 }}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") setHovered(datesIndex);
                  }}
                  onPointerLeave={() => setHovered((current) => (current === datesIndex ? null : current))}
                >
                  <UpcomingDatesNavItem variant="menu" index={datesIndex} labelClassName={BAR_LABEL} onSelect={close} />
                </motion.li>
              </ul>
            </nav>
          ) : null}
        </div>
      </header>

      <AnimatePresence>
        {overlay ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            ref={overlayRef}
            className="fixed inset-0 z-[65] flex flex-col bg-black/55 text-white backdrop-blur-2xl md:bg-transparent md:backdrop-blur-none"
            style={{ clipPath: `circle(150% at ${origin})` }}
          >
            <nav className="flex flex-1 flex-col justify-center overflow-y-auto px-6 pt-28 pb-8 md:px-16 md:pb-10">
              <ul className="flex flex-col gap-2 md:gap-1">
                {renderItems(OVERLAY_LABEL)}
                <motion.li
                  initial={reduced ? false : { opacity: 0, y: 28, filter: "blur(12px)" }}
                  animate={{ opacity: hovered !== null && hovered !== datesIndex ? 0.32 : 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration, ease: EASE_OUT, delay: reduced ? 0 : 0.24 + datesIndex * 0.07 }}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") setHovered(datesIndex);
                  }}
                  onPointerLeave={() => setHovered((current) => (current === datesIndex ? null : current))}
                >
                  <UpcomingDatesNavItem variant="menu" index={datesIndex} labelClassName={OVERLAY_LABEL} onSelect={close} />
                </motion.li>
              </ul>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <UpcomingDatesDialog />
    </>
  );
}
