import { useBlocker, useRouter, type ShouldBlockFn } from "@tanstack/react-router";
import { useCallback } from "react";
import { isIntroDone } from "@/lib/intro";

/**
 * Route transitions: the same curtain as the first-load intro (LoadingExperience).
 *
 * 1. A navigation that changes the pathname is held (router blocker) while the curtain drops
 *    over the current page and the destination route is preloaded (loader data + JS chunk).
 * 2. The navigation then commits *behind* the closed curtain (scroll reset happens there too).
 * 3. Once the new page has rendered, its first-viewport images are decoded, fonts are ready and
 *    any component that asked to hold the reveal (e.g. the home Three.js tunnel) is ready, the
 *    curtain lifts exactly like the intro does. Timeouts guarantee it never gets stuck.
 *
 * Only the fixed overlay is animated (never the page wrapper), so `position: fixed` content is
 * unaffected. Search/hash-only updates (e.g. `?datas=1`), `router.invalidate()` and the first
 * load (the intro handles that) never trigger it. Reduced motion: a short opacity fade instead.
 */

const CLOSE_MS = 300;
const OPEN_MS = 480;
const EASE = "cubic-bezier(.76,0,.24,1)";
/** Longest we keep the old page covered waiting for the next route's data before committing. */
const PRELOAD_TIMEOUT = 4000;
/** Longest we wait (from the new page's render) for its images / holds before revealing. */
const READY_TIMEOUT = 900;
/** Safety net: lift the curtain even if the router never reports the render. */
const FAILSAFE_MS = 6000;
/** First-viewport images awaited (decoded) before the reveal. */
const MAX_IMAGES = 6;

type CurtainParts = { root: HTMLElement; panel: HTMLElement; edge: HTMLElement };

let parts: CurtainParts | null = null;
let phase: "idle" | "closing" | "closed" | "opening" = "idle";
let closing: Promise<void> | null = null;
let running: Animation[] = [];
let seq = 0;
let active = false;
const holds = new Set<Promise<void>>();

const leaveListeners = new Set<() => void>();

/**
 * Called when the curtain starts covering the current page for a navigation away from it.
 * Heavy pages (the home Three.js tunnel) use it to stop rendering, freeing the main thread so
 * the curtain and the next route stay smooth.
 */
export function onPageLeave(listener: () => void) {
  leaveListeners.add(listener);
  return () => {
    leaveListeners.delete(listener);
  };
}

export function registerPageCurtain(next: CurtainParts) {
  parts = next;
  return () => {
    if (parts === next) parts = null;
  };
}

/**
 * Lets a component on the destination page delay the reveal until it is visually ready
 * (capped by READY_TIMEOUT). Returns the release function; a no-op outside transitions.
 */
export function holdPageReveal(): () => void {
  if (!active) return () => {};
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  holds.add(promise);
  return () => {
    holds.delete(promise);
    release();
  };
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const within = (promise: Promise<unknown>, ms: number) =>
  Promise.race([
    promise.then(
      () => undefined,
      () => undefined,
    ),
    wait(ms),
  ]);
const isPrivate = (pathname: string) => pathname === "/auth" || pathname.startsWith("/admin");

function stopRunning() {
  for (const animation of running) animation.cancel();
  running = [];
}

function pulseGlitch(_root: HTMLElement) {
  /* Nocturna uses a clean curtain — no RGB glitch slices. */
}

// The panel is a solid colour, so sliding it (transform) looks exactly like the intro's clip-path
// wipe but runs on the compositor: smooth even while the next page is busy on the main thread.
// The edge is a full-size box whose bottom border is the glowing line, moved in sync with it.
const HIDDEN = "translate3d(0, -100%, 0)";
const SHOWN = "translate3d(0, 0, 0)";

function closeCurtain(): Promise<void> {
  if (!parts) return Promise.resolve();
  if ((phase === "closing" || phase === "closed") && closing) return closing;
  const { root, panel, edge } = parts;
  // Start from wherever the curtain is (a navigation during the reveal re-closes it).
  const reopening = phase === "opening";
  const fromPanel = reopening ? getComputedStyle(panel).transform : HIDDEN;
  const fromOpacity = reopening ? getComputedStyle(panel).opacity : "0";
  stopRunning();
  phase = "closing";
  root.setAttribute("data-active", "");
  pulseGlitch(root);
  if (reducedMotion()) {
    panel.style.transform = SHOWN;
    running = [
      panel.animate([{ opacity: fromOpacity }, { opacity: 1 }], {
        duration: 160,
        fill: "forwards",
      }),
    ];
  } else {
    const options = { duration: CLOSE_MS, easing: EASE, fill: "forwards" as const };
    running = [
      // The curtain drops from the top, a thin glowing line on its edge (the intro in reverse).
      panel.animate([{ transform: fromPanel }, { transform: SHOWN }], options),
      edge.animate(
        [
          { transform: HIDDEN, opacity: 0 },
          { opacity: 1, offset: 0.15 },
          { opacity: 1, offset: 0.85 },
          { transform: SHOWN, opacity: 0 },
        ],
        options,
      ),
    ];
  }
  const animations = running;
  closing = Promise.all(animations.map((a) => a.finished)).then(
    () => {
      if (running === animations) phase = "closed";
    },
    () => undefined,
  );
  return closing;
}

function openCurtain(): Promise<void> {
  if (!parts) return Promise.resolve();
  const { root, panel, edge } = parts;
  stopRunning();
  phase = "opening";
  closing = null;
  pulseGlitch(root);
  if (reducedMotion()) {
    panel.style.transform = SHOWN;
    running = [
      panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" }),
    ];
  } else {
    const options = { duration: OPEN_MS, easing: EASE, fill: "forwards" as const };
    running = [
      // Same motion as the intro curtain: lifts upward, glowing edge sweeping bottom -> top.
      panel.animate([{ transform: SHOWN }, { transform: HIDDEN }], options),
      edge.animate(
        [
          { transform: SHOWN, opacity: 0 },
          { opacity: 1, offset: 0.12 },
          { opacity: 1, offset: 0.85 },
          { transform: HIDDEN, opacity: 0 },
        ],
        options,
      ),
    ];
  }
  const animations = running;
  return Promise.all(animations.map((a) => a.finished)).then(
    () => {
      if (running !== animations) return; // re-closed by a newer navigation
      for (const animation of animations) animation.cancel();
      running = [];
      panel.style.transform = "";
      root.classList.remove("is-glitching");
      root.removeAttribute("data-active");
      phase = "idle";
    },
    () => undefined,
  );
}

/** Wait until what the visitor will see first is actually painted-ready (at most READY_TIMEOUT). */
function pageReady() {
  return within(
    (async () => {
      // Let the new route's effects run (they may register holds) and layout settle.
      await nextFrame();
      await nextFrame();
      const images = [...document.querySelectorAll<HTMLImageElement>("body img")].filter((img) => {
        if (!img.currentSrc && !img.src) return false;
        const rect = img.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight &&
          rect.right > 0 &&
          rect.left < window.innerWidth
        );
      });
      // Masonry images that haven't loaded yet have no height and all "fit" the viewport: only
      // the first few in document order are what the visitor actually sees first.
      images.splice(MAX_IMAGES);
      await Promise.all([
        document.fonts?.ready,
        ...images.map((img) => img.decode().catch(() => undefined)),
        ...holds,
      ]);
    })(),
    READY_TIMEOUT,
  );
}

function revealAfterRender(router: ReturnType<typeof useRouter>, token: number) {
  let done = false;
  const reveal = async () => {
    if (done) return;
    done = true;
    unsubscribe();
    window.clearTimeout(failsafe);
    await pageReady();
    if (token !== seq) return; // a newer navigation owns the curtain now
    await openCurtain();
    if (token === seq) {
      active = false;
      holds.clear();
    }
  };
  const unsubscribe = router.subscribe("onRendered", () => void reveal());
  const failsafe = window.setTimeout(() => void reveal(), FAILSAFE_MS);
}

export function usePageTransitions() {
  const router = useRouter();

  const shouldBlockFn = useCallback<ShouldBlockFn>(
    async ({ current, next, action }) => {
      if (current.pathname === next.pathname) return false;
      if (!parts || !isIntroDone()) return false;
      if (isPrivate(current.pathname) && isPrivate(next.pathname)) return false;

      const token = ++seq;
      active = true;
      leaveListeners.forEach((listener) => listener());
      const preload = router
        .preloadRoute({ to: next.pathname, search: next.search } as Parameters<
          typeof router.preloadRoute
        >[0])
        .catch(() => undefined);
      await Promise.all([closeCurtain(), within(preload, PRELOAD_TIMEOUT)]);

      // Superseded by a newer click while we were closing/loading: drop this one.
      if (token !== seq && (action === "PUSH" || action === "REPLACE")) return true;
      revealAfterRender(router, token);
      return false;
    },
    [router],
  );

  useBlocker({ shouldBlockFn, enableBeforeUnload: false });
}
