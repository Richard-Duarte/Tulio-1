/**
 * Shared state for the first-load intro (LoadingExperience).
 *
 * - The SSR document ships the overlay in the HTML, and `introBootScript` runs in <head>
 *   before first paint to decide whether it should be shown (once per browser session).
 * - Components can report readiness (e.g. the Three.js tunnel) via `signalIntroReady`.
 * - Anything that must wait for the intro (idle prefetch, page transitions) uses `onIntroDone`.
 *
 * `<html data-intro>` values: "active" (loader visible, scroll locked, page reveal paused),
 * "reveal" (curtain lifting, page reveal playing), "done", or "skip" (already seen this session).
 */

export const INTRO_SEEN_KEY = "jula-intro-seen";

export type IntroSignal = "scene";

const signals = new Set<IntroSignal>();
const signalListeners = new Map<IntroSignal, Set<() => void>>();
const doneListeners = new Set<() => void>();
let booted = false;
let done = false;

export function signalIntroReady(name: IntroSignal) {
  if (signals.has(name)) return;
  signals.add(name);
  signalListeners.get(name)?.forEach((listener) => listener());
  signalListeners.delete(name);
}

export function whenIntroSignal(name: IntroSignal, listener: () => void) {
  if (signals.has(name)) {
    listener();
    return () => {};
  }
  const listeners = signalListeners.get(name) ?? new Set();
  listeners.add(listener);
  signalListeners.set(name, listeners);
  return () => listeners.delete(listener);
}

/** True only while rendering the SSR document or hydrating it (never on client-side navigation). */
export function isIntroBootRender() {
  return typeof window === "undefined" || !booted;
}

export function markIntroBooted() {
  booted = true;
}

export function getIntroState() {
  return document.documentElement.getAttribute("data-intro");
}

export function setIntroState(state: "active" | "reveal" | "done") {
  document.documentElement.setAttribute("data-intro", state);
}

export function isIntroDone() {
  return done;
}

export function completeIntro() {
  if (done) return;
  done = true;
  if (getIntroState() !== "skip") setIntroState("done");
  try {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // sessionStorage can be unavailable (privacy mode); the intro will simply show again.
  }
  doneListeners.forEach((listener) => listener());
  doneListeners.clear();
}

export function onIntroDone(listener: () => void) {
  if (done) {
    listener();
    return () => {};
  }
  doneListeners.add(listener);
  return () => doneListeners.delete(listener);
}

/** Inline <head> script: runs before first paint so returning visitors never see the overlay. */
export const introBootScript = `(function(){try{var d=document.documentElement,p=location.pathname,skip=p==="/auth"||p.indexOf("/admin")===0||sessionStorage.getItem("${INTRO_SEEN_KEY}")==="1";d.setAttribute("data-intro",skip?"skip":"active")}catch(e){}})();`;

/** Critical CSS inlined in <head> so the very first paint is already dark (no white flash). */
export const introCriticalCss = `html,body{background:#000106;color-scheme:dark}`;

/** Without JS the overlay would never be dismissed, so hide it entirely. */
export const introNoScriptCss = `<style>.intro-loader{display:none!important}html{overflow:auto!important}</style>`;
