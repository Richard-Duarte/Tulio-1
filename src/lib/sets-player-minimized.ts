/** Same breakpoint as ScenePreview: narrow viewports and coarse pointers start minimized. */
export function isSetsPlayerMobileViewport(): boolean {
  if (typeof window === "undefined") return true;
  const mm = (q: string) => window.matchMedia(q).matches;
  return mm("(max-width: 767px)") || mm("(pointer: coarse)");
}

export function isSetsRoute(pathname: string): boolean {
  return pathname === "/sets" || pathname.startsWith("/sets/");
}

/**
 * Default minimized state when the user has not chosen minimize/expand for this route this session.
 * Mobile: always minimized. Desktop: expanded on /sets only.
 */
export function defaultSetsPlayerMinimized(pathname: string): boolean {
  if (isSetsPlayerMobileViewport()) return true;
  return !isSetsRoute(pathname);
}

/** Per-route session key so minimizing on home does not force minimized on /sets. */
export function setsPlayerMinimizedSessionKey(baseKey: string, pathname: string): string {
  return `${baseKey}::${pathname}`;
}