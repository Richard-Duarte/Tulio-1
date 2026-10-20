/** Default title for the home bio block (admin field: Trajetória). */
export const DEFAULT_HERO_TITLE = "Trajetória";

/** Role line under the home bio on desktop. */
export const HERO_ROLE_LINE = "DJ · produtor · SP · BR";

export function resolveHeroTitle(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed || DEFAULT_HERO_TITLE;
}
