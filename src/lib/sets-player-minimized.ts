/** Same breakpoint as ScenePreview: narrow viewports and coarse pointers start minimized. */
export function isSetsPlayerMobileViewport(): boolean {
  if (typeof window === "undefined") return true;
  const mm = (q: string) => window.matchMedia(q).matches;
  return mm("(max-width: 767px)") || mm("(pointer: coarse)");
}

/**
 * Default minimized state when the user has not chosen minimize/expand this session.
 * Minimized on every page (mobile and desktop); autoplay still runs in the background.
 */
export function defaultSetsPlayerMinimized(_pathname: string): boolean {
  return true;
}