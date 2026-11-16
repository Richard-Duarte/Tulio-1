import {
  parsePresskitLogoVariants,
  presskitLogoUrlsForDownload,
  primaryPresskitLogoUrl,
} from "./presskit-logo-variants.ts";
import { DEFAULT_SITE_LOGO } from "./site-logo.ts";
import { DEFAULT_SITE_WORDMARK } from "./presskit-logo-variants.ts";

export function parsePresskitLogoUrls(
  presskitLogoUrls: unknown,
  logoUrl: string | null | undefined,
): string[] {
  const urls = presskitLogoUrlsForDownload(parsePresskitLogoVariants(presskitLogoUrls, logoUrl));
  if (urls.length > 0) return urls;
  const single = logoUrl?.trim();
  if (single) return [single];
  return [DEFAULT_SITE_WORDMARK, DEFAULT_SITE_LOGO];
}

export function presskitDisplayLogoUrl(
  presskitLogoUrls: unknown,
  logoUrl: string | null | undefined,
): string {
  return primaryPresskitLogoUrl(presskitLogoUrls, logoUrl);
}