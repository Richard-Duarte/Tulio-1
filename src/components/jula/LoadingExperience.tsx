import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import logo from "@/assets/jula-logo.png.asset.json";
import { useI18n } from "@/lib/i18n";
import {
  completeIntro,
  getIntroState,
  isIntroBootRender,
  setIntroState,
  whenIntroSignal,
} from "@/lib/intro";

type Phase = "loading" | "exit" | "gone";

/** Never shorter than this (ms since navigation start), so the logo registers. */
const MIN_DURATION = 1000;
/** Never longer than this: whatever is still loading keeps loading behind the site. */
const MAX_DURATION = 7000;
/** Delay before the curtain starts lifting (bar/label fade out first). */
const CURTAIN_DELAY = 250;
/** Must match the `intro-curtain` animation in styles.css. */
const CURTAIN_DURATION = 950;

/**
 * First-load intro: rendered in the SSR HTML (so the first paint is already the black
 * overlay with the logo), progress tracks real readiness (hydration, fonts, window load and
 * the Three.js tunnel on the home page), then a curtain lifts and the page reveal plays.
 * Shown once per browser session; never on client-side navigation.
 */
export function LoadingExperience() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [phase, setPhase] = useState<Phase>(() => (isIntroBootRender() ? "loading" : "gone"));
  const [reducedMotion, setReducedMotion] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const home = pathname === "/";

  useEffect(() => {
    if (phase !== "loading") return;
    // Already seen this session (decided pre-paint by the boot script), or hydration was so
    // slow that the CSS failsafe has already hidden the overlay.
    if (getIntroState() === "skip" || performance.now() > MAX_DURATION + 1500) {
      setPhase("gone");
      completeIntro();
      return;
    }

    setIntroState("active");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduced);

    const tasks = [
      { weight: 0.15, done: true }, // hydrated
      { weight: 0.2, done: false }, // fonts
      { weight: home ? 0.35 : 0.65, done: false }, // window load (images, logo, stylesheets)
      ...(home ? [{ weight: 0.3, done: false }] : []), // Three.js tunnel first frame
    ];
    const complete = (index: number) => () => {
      const task = tasks[index];
      if (task) task.done = true;
    };
    const onFonts = complete(1);
    const onLoad = complete(2);

    if (document.fonts) document.fonts.ready.then(onFonts, onFonts);
    else onFonts();
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    const stopScene = home ? whenIntroSignal("scene", complete(3)) : () => {};

    // Take over from the CSS boot animation (which fills the bar before hydration) without a jump.
    const bar = barRef.current;
    let shown = 0;
    if (bar) {
      shown = new DOMMatrixReadOnly(getComputedStyle(bar).transform).a || 0;
      bar.style.animation = "none";
      bar.style.transform = `scaleX(${shown})`;
    }

    const timers: number[] = [];
    let frame = 0;
    const tick = () => {
      const elapsed = performance.now();
      const ready = tasks.every((task) => task.done);
      const target = tasks.reduce((sum, task) => sum + (task.done ? task.weight : 0), 0);
      // Creep slowly with time so the bar never looks frozen, but only fill once truly ready.
      let goal = Math.min(0.92, Math.max(target, (elapsed / MAX_DURATION) * 0.9));
      if ((ready && elapsed >= MIN_DURATION) || elapsed >= MAX_DURATION) goal = 1;
      shown += (goal - shown) * (goal === 1 ? 0.2 : 0.07);
      if (goal === 1 && shown > 0.995) shown = 1;
      if (bar) bar.style.transform = `scaleX(${shown})`;
      if (shown < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }
      setPhase("exit");
      const curtainDelay = reduced ? 0 : CURTAIN_DELAY;
      const curtainDuration = reduced ? 300 : CURTAIN_DURATION;
      // Let the page's own reveal (.page-enter) start as the curtain begins to lift.
      timers.push(window.setTimeout(() => setIntroState("reveal"), curtainDelay));
      timers.push(
        window.setTimeout(() => {
          setPhase("gone");
          completeIntro();
        }, curtainDelay + curtainDuration),
      );
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("load", onLoad);
      stopScene();
    };
    // Runs once for the boot render; later route changes must not restart the intro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "gone") return null;
  return (
    <div
      aria-hidden
      className="intro-loader"
      data-phase={phase}
      data-home={home || undefined}
      data-reduced={reducedMotion || undefined}
    >
      <div className="intro-curtain">
        <div className="intro-stage">
          <img
            src={logo.url}
            alt=""
            className="intro-logo h-auto w-full invert"
            fetchPriority="high"
          />
          <div className="intro-meta flex flex-col items-center gap-4">
            <div className="h-px w-52 overflow-hidden bg-border">
              <div ref={barRef} className="intro-bar h-full w-full origin-left bg-primary" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[.32em] text-muted-foreground">
              {t("loading")}
            </p>
          </div>
        </div>
      </div>
      <div className="intro-edge" />
    </div>
  );
}
