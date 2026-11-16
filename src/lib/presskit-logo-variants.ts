import { DEFAULT_SITE_LOGO, resolveSiteLogoUrl } from "./site-logo.ts";

export const DEFAULT_SITE_WORDMARK = "/brand/tulio-wordmark.png";

export const PRESSKIT_LOGO_GROUPS = [
  {
    id: "logo",
    title: "Logo",
    description:
      "Escrita Tulio. Ao salvar, atualiza menu, pre-loader, rodapé, auth e demais pontos com o nome.",
    slots: [
      { key: "escrita_clara", label: "Clara (fundo escuro)", previewBg: "bg-black" as const },
      { key: "escrita_escura", label: "Escura (fundo claro)", previewBg: "bg-white" as const },
    ],
  },
  {
    id: "icon",
    title: "Ícone",
    description: "Símbolo / marca gráfica (ex.: olho na home). Versão clara e escura para o presskit.",
    slots: [
      { key: "icon_clara", label: "Clara (fundo escuro)", previewBg: "bg-black" as const },
      { key: "icon_escura", label: "Escura (fundo claro)", previewBg: "bg-white" as const },
    ],
  },
] as const;

/** Flat list of all upload slots (presskit download order: logo then ícone). */
export const PRESSKIT_LOGO_SLOTS = PRESSKIT_LOGO_GROUPS.flatMap((g) => g.slots);

export type PresskitLogoSlotKey = (typeof PRESSKIT_LOGO_SLOTS)[number]["key"];

export type PresskitLogoVariants = Record<PresskitLogoSlotKey, string | null>;

const emptyVariants = (): PresskitLogoVariants => ({
  icon_clara: null,
  icon_escura: null,
  escrita_clara: null,
  escrita_escura: null,
});

/** Coerces DB json (structured object or legacy string[]) into four slots. */
export function parsePresskitLogoVariants(
  presskitLogoUrls: unknown,
  logoUrl?: string | null,
): PresskitLogoVariants {
  const base = emptyVariants();
  if (presskitLogoUrls && typeof presskitLogoUrls === "object" && !Array.isArray(presskitLogoUrls)) {
    const row = presskitLogoUrls as Record<string, unknown>;
    for (const slot of PRESSKIT_LOGO_SLOTS) {
      const v = row[slot.key];
      base[slot.key] = typeof v === "string" && v.trim() ? v.trim() : null;
    }
    if (Object.values(base).some(Boolean)) return base;
  }
  if (Array.isArray(presskitLogoUrls)) {
    const list = presskitLogoUrls
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);
    if (list[0]) base.escrita_clara = list[0];
    if (list[1]) base.escrita_escura = list[1];
    if (list[2]) base.icon_clara = list[2];
    if (list[3]) base.icon_escura = list[3];
    if (Object.values(base).some(Boolean)) return base;
  }
  const single = logoUrl?.trim();
  if (single) {
    base.escrita_clara = single;
  }
  return base;
}

export function presskitLogoUrlsForDownload(variants: PresskitLogoVariants): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const slot of PRESSKIT_LOGO_SLOTS) {
    const url = variants[slot.key]?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/** Dark UI (header, pre-loader): prefer light/colored wordmark on black. */
export function siteWordmarkUrl(
  presskitLogoUrls: unknown,
  logoUrl?: string | null,
): string {
  const v = parsePresskitLogoVariants(presskitLogoUrls, logoUrl);
  return (
    v.escrita_clara?.trim() ||
    v.escrita_escura?.trim() ||
    logoUrl?.trim() ||
    DEFAULT_SITE_WORDMARK
  );
}

export function siteIconUrl(presskitLogoUrls: unknown, logoUrl?: string | null): string {
  const v = parsePresskitLogoVariants(presskitLogoUrls, logoUrl);
  return (
    v.icon_clara?.trim() ||
    v.icon_escura?.trim() ||
    resolveSiteLogoUrl(logoUrl)
  );
}

export function primaryPresskitLogoUrl(
  presskitLogoUrls: unknown,
  logoUrl?: string | null,
): string {
  const v = parsePresskitLogoVariants(presskitLogoUrls, logoUrl);
  return (
    v.escrita_clara?.trim() ||
    v.escrita_escura?.trim() ||
    v.icon_clara?.trim() ||
    resolveSiteLogoUrl(logoUrl)
  );
}

export { DEFAULT_SITE_LOGO };