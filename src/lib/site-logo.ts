const DEFAULT_SITE_LOGO = "/brand/tulio-mark.png";

export function resolveSiteLogoUrl(logoUrl: string | null | undefined): string {
  const trimmed = logoUrl?.trim();
  return trimmed || DEFAULT_SITE_LOGO;
}

export { DEFAULT_SITE_LOGO };