/** Browser / session keys — use `tulio-*`; legacy `jula-*` only for one-time migration reads. */

export const INTRO_SEEN_KEY = "tulio-intro-seen";
export const LEGACY_INTRO_SEEN_KEY = "jula-intro-seen";

export const SETS_PLAYER_MIN_BASE_KEY = "tulio-sets-player-min";
export const LEGACY_SETS_PLAYER_MIN_BASE_KEY = "jula-sets-player-min";

export const PRESSKIT_SESSION_COOKIE = "tulio-presskit";

/** Read primary sessionStorage key; optionally migrate from a legacy key. */
export function readSessionStorageWithLegacy(primaryKey: string, legacyKey?: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const current = window.sessionStorage.getItem(primaryKey);
    if (current !== null) return current;
    if (!legacyKey) return null;
    const legacy = window.sessionStorage.getItem(legacyKey);
    if (legacy === null) return null;
    window.sessionStorage.setItem(primaryKey, legacy);
    return legacy;
  } catch {
    return null;
  }
}