import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { EmbedHandle, SceneQuality } from "@/lib/underground/embed.js";
import { onPageLeave } from "@/lib/page-transition";

/*
 * Full-viewport 3D background for /sets: Keta's "Underground" warehouse scene (booth, stacks,
 * lasers, crowd, DJ on a 128 BPM clock) in its embed mode — no UI, no controls, no intro, slow
 * automatic camera drift framing the booth.
 *
 *  - client-only: three.js + the scene code are dynamically imported after first paint (idle)
 *  - the scene pauses itself when the tab is hidden and frees everything on dispose (unmount)
 *  - quality preset: "high" (DPR ≤ 1.5, MSAA, shadows) on desktop, "low" (DPR 1, half-res bloom,
 *    fewer movers/crowd/haze, no shadows) on touch / small / low-core devices; if the measured
 *    frame rate stays low it steps down to "low" and finally to the static poster
 *  - poster (a still of the scene) when WebGL is unavailable or prefers-reduced-motion is set
 *  - debug override: ?scene=high | low | off
 *
 * The DJ model is public/3d/models/dj.glb — replace that one file to swap in a new DJ.
 */

const MODELS_BASE = "/3d/models/";
const POSTER = "/3d/underground-poster.webp";
const POSTER_MOBILE = "/3d/underground-poster-mobile.webp";

type Mode = "pending" | "live" | "poster";

const PASSTHROUGH_CSS =
  "@layer base{body[data-scene-controls]{pointer-events:none}body[data-scene-controls]>*{pointer-events:auto}}";

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    const ok = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

/** Average frame rate over `ms` (rAF based: what the visitor actually gets). */
function sampleFps(ms: number, signal: { cancelled: boolean }): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    let t0 = 0;
    const tick = (t: number) => {
      if (signal.cancelled) return resolve(60);
      if (document.hidden) {
        t0 = 0; // hidden tab: the scene is paused, start over
        frames = 0;
      } else if (!t0) t0 = t;
      else frames++;
      if (!t0 || t - t0 < ms) requestAnimationFrame(tick);
      else resolve((frames * 1000) / (t - t0));
    };
    requestAnimationFrame(tick);
  });
}

export function UndergroundScene() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [mode, setMode] = useState<Mode>("pending");
  const [ready, setReady] = useState(false);
  // Mouse camera control (drag = rotate, right-drag = pan, ctrl/pinch or click-then-wheel = zoom).
  const [controls, setControls] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHost(document.body);
    // <html> and <body> both paint the page color (intro critical CSS); let the body go
    // transparent while the scene is up so the fixed z-[-1] layer shows through.
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "transparent";
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!host || !container) return;
    const param = new URLSearchParams(window.location.search).get("scene");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (param === "off" || (reduce && param !== "high" && param !== "low")) {
      setMode("poster");
      return;
    }
    // One-finger drag rotates the camera on desktop and on touch screens.
    const withControls = new URLSearchParams(window.location.search).get("controls") !== "0";
    const signal = { cancelled: false };
    let handle: EmbedHandle | null = null;

    const run = async (quality: SceneQuality | "auto") => {
      const { mount, detectQuality } = await import("@/lib/underground/embed.js");
      if (signal.cancelled) return;
      const q: SceneQuality = quality === "auto" ? detectQuality() : quality;
      handle = mount(container, {
        orbit: true,
        controls: withControls,
        resumeAfter: 8,
        quality: q,
        modelsBaseUrl: MODELS_BASE,
        strobe: true,
      });
      try {
        const api = await handle.ready;
        // dev-only hook for the Playwright checks (camera mode/position)
        if (import.meta.env.DEV)
          (window as unknown as { __underground?: unknown }).__underground = api;
      } catch (e) {
        console.warn("[underground] scene failed, showing poster", e);
        handle.dispose();
        handle = null;
        if (!signal.cancelled) setMode("poster");
        return;
      }
      if (signal.cancelled) return;
      setReady(true);
      setControls(withControls);
      if (param === "high" || param === "low") return; // forced quality: no auto step-down
      // Watch the real frame rate for the first ~20 s (after shaders/textures settle); step
      // down to "low", then to the poster, if the device can't keep up.
      await new Promise((r) => setTimeout(r, 2000));
      for (let window_ = 0; window_ < 4 && !signal.cancelled; window_++) {
        const fps = await sampleFps(4000, signal);
        if (signal.cancelled) return;
        if (fps < 28 && q === "high") {
          handle?.dispose();
          handle = null;
          setReady(false);
          setControls(false);
          void run("low");
          return;
        }
        if (fps < 20) {
          handle?.dispose();
          handle = null;
          setControls(false);
          setMode("poster");
          return;
        }
      }
    };

    // Lazy: don't compete with the page's first paint / hydration. (Also means a transient
    // mount — e.g. the old route re-keyed during a navigation — costs nothing.)
    const start = () => {
      if (signal.cancelled) return;
      if (!webglAvailable()) {
        setMode("poster");
        return;
      }
      setMode("live");
      void run(param === "high" || param === "low" ? param : "auto");
    };
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 1200 })
      : window.setTimeout(start, 250);
    // Route transition: free the GPU/main thread as soon as the curtain starts covering the page
    // (the route unmounts behind the closed curtain; this just stops rendering earlier).
    const stopLeave = onPageLeave(() => {
      signal.cancelled = true;
      handle?.dispose();
      handle = null;
    });
    return () => {
      stopLeave();
      signal.cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      window.clearTimeout(idle);
      handle?.dispose();
      handle = null;
    };
  }, [host]);

  // While the camera is controllable, let pointer events fall through everything that sits above
  // the fixed z-[-1] canvas in hit-testing order: <body> itself (its box is hit before negative
  // z-index layers) and the route wrappers around the /sets <main>. Other body children (header,
  // footer, player, toasts/dialogs added later) keep pointer-events:auto via PASSTHROUGH_CSS, which
  // sits in the `base` layer so Tailwind's pointer-events utilities still win. The <main> marks itself
  // with data-scene-passthrough and is pointer-events:none, re-enabling only its interactive/text
  // elements, so drags on empty space reach the canvas.
  const interactive = controls && ready && mode === "live";
  useEffect(() => {
    if (!interactive) return;
    const main = document.querySelector<HTMLElement>("[data-scene-passthrough]");
    const touched: [HTMLElement, string][] = [];
    for (let el = main?.parentElement; el && el !== document.body; el = el.parentElement) {
      touched.push([el, el.style.pointerEvents]);
      el.style.pointerEvents = "none";
    }
    document.body.setAttribute("data-scene-controls", "");
    return () => {
      document.body.removeAttribute("data-scene-controls");
      for (const [el, prev] of touched) el.style.pointerEvents = prev;
    };
  }, [interactive]);

  if (!host) return null;
  // Portal to <body> so `fixed` is relative to the viewport (the route wrapper animates transforms).
  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden bg-background"
      data-underground-scene={mode}
    >
      {interactive && <style>{PASSTHROUGH_CSS}</style>}
      <picture className="pointer-events-none">
        <source media="(max-width: 767px)" srcSet={POSTER_MOBILE} />
        <img
          src={POSTER}
          alt=""
          decoding="async"
          className="pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-1000"
          style={{ opacity: mode === "poster" ? 1 : ready ? 0 : 0.55 }}
        />
      </picture>
      {/* readability veil: darker at the top (title) and bottom (list/footer), and on the text side */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-background)_78%,transparent)_0%,color-mix(in_oklab,var(--color-background)_52%,transparent)_38%,color-mix(in_oklab,var(--color-background)_62%,transparent)_70%,color-mix(in_oklab,var(--color-background)_88%,transparent)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-background/20 md:hidden" />
      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,color-mix(in_oklab,var(--color-background)_55%,transparent)_0%,transparent_65%)] md:block" />
      <div
        ref={containerRef}
        className={`absolute inset-0 transition-opacity duration-1000 ${interactive ? "pointer-events-auto touch-none" : "pointer-events-none"}`}
        data-scene-controls={interactive ? "" : undefined}
        style={{ opacity: ready && mode === "live" ? 1 : 0 }}
      />
    </div>,
    host,
  );
}
