/** Normalizes site_settings for PresskitAdminPanel so missing/null DB fields never crash the tab. */
export type PresskitAdminSettings = {
  release_title: string;
  release_body: string;
  logo_url: string | null;
  presskit_logo_urls?: unknown;
  presskit_rider?: unknown;
};

export function coercePresskitAdminSettings(raw: unknown): PresskitAdminSettings {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const releaseTitle = row.release_title;
  const releaseBody = row.release_body;
  const logoUrl = row.logo_url;
  return {
    release_title: typeof releaseTitle === "string" ? releaseTitle : "",
    release_body: typeof releaseBody === "string" ? releaseBody : "",
    logo_url: typeof logoUrl === "string" ? logoUrl : logoUrl === null ? null : null,
    presskit_logo_urls: row.presskit_logo_urls,
    presskit_rider: row.presskit_rider,
  };
}