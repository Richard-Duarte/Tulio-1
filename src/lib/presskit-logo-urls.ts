import { DEFAULT_SITE_LOGO } from "./site-logo.ts";

export function parsePresskitLogoUrls(
  presskitLogoUrls: unknown,
  logoUrl: string | null | undefined,
): string[] {
  if (Array.isArray(presskitLogoUrls)) {
    const fromDb = presskitLogoUrls
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);
    if (fromDb.length > 0) return fromDb;
  }
  const single = logoUrl?.trim();
  if (single) return [single];
  return [DEFAULT_SITE_LOGO];
}

export function presskitDisplayLogoUrl(
  presskitLogoUrls: unknown,
  logoUrl: string | null | undefined,
): string {
  const urls = parsePresskitLogoUrls(presskitLogoUrls, logoUrl);
  return urls[0]?.trim() || DEFAULT_SITE_LOGO;
}