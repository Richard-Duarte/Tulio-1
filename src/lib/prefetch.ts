import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { onIntroDone } from "@/lib/intro";

/** Public pages warmed after the intro (incl. home, so the logo link opens it without waiting on
 * its data). Admin/Auth are intentionally excluded. */
const PUBLIC_ROUTES = ["/galeria", "/sets", "/live-sets", "/releases", "/presskit", "/"] as const;
const IMAGES_PER_ROUTE = 4;

type ConnectionInfo = { saveData?: boolean; effectiveType?: string };

function connection() {
  return (navigator as Navigator & { connection?: ConnectionInfo }).connection;
}

/** Respect data saver and very slow connections: skip proactive prefetching entirely. */
function isConstrained() {
  const info = connection();
  return info?.saveData === true || /(^|-)2g$/.test(info?.effectiveType ?? "");
}

function whenIdle(callback: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, 800);
  return () => window.clearTimeout(id);
}

/** Collect a few first-screen image URLs from a route's loader data (media grids, covers). */
function collectImages(data: unknown) {
  const urls: string[] = [];
  if (!data || typeof data !== "object") return urls;
  for (const value of Object.values(data)) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (urls.length >= IMAGES_PER_ROUTE) return urls;
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const { kind, public_url: publicUrl, cover_url: coverUrl } = record;
      if (kind === "image" && typeof publicUrl === "string") urls.push(publicUrl);
      else if (typeof coverUrl === "string") urls.push(coverUrl);
    }
  }
  return urls;
}

function warmImages(matches: Array<{ loaderData?: unknown }> | undefined) {
  if (connection()?.effectiveType && connection()?.effectiveType !== "4g") return;
  for (const match of matches ?? []) {
    for (const url of collectImages(match.loaderData)) {
      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = "low";
      image.src = url;
    }
  }
}

/**
 * After the intro finishes and the browser is idle, preload the other public routes one at a
 * time (JS chunks + loader data land in the router cache), so navigating to them is instant.
 * Uses the same loaders as a normal visit, so password-protected content stays protected.
 */
export function useIdleRoutePrefetch() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let cancelIdle = () => {};

    const stopWaiting = onIntroDone(() => {
      if (isConstrained()) return;
      const queue = PUBLIC_ROUTES.filter((to) => to !== router.state.location.pathname);
      const next = () => {
        cancelIdle = whenIdle(async () => {
          const to = queue.shift();
          if (!to || cancelled) return;
          try {
            warmImages(await router.preloadRoute({ to }));
          } catch {
            // Preloading is best-effort; the page will simply load on navigation.
          }
          if (!cancelled) next();
        });
      };
      next();
    });

    return () => {
      cancelled = true;
      stopWaiting();
      cancelIdle();
    };
  }, [router]);
}
