import { DEFAULT_SITE_LOGO } from "./site-logo.ts";

export const DEFAULT_SITE_WORDMARK = "/brand/tulio-wordmark.png";

export const PRESSKIT_LOGO_GROUPS = [
  {
    id: "logo",
    title: "Logo",
    description:
      "Escrita TULIO da barra de menu (não é o triângulo). Ao salvar, atualiza menu, pre-loader, rodapé e auth.",
    slots: [
      { key: "escrita_clara", label: "Clara (fundo escuro)" },
      { key: "escrita_escura", label: "Escura / preta (fundo claro)" },
    ],
  },
  {
    id: "icon",
    title: "Ícone",
    description: "Símbolo / marca gráfica (ex.: olho na home). Versão clara e escura para o presskit.",
    slots: [
      { key: "icon_clara", label: "Clara (fundo escuro)" },
      { key: "icon_escura", label: "Escura / preta (fundo claro)" },
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

/** Home eye / triangle mark — never fall back to wordmark (`logo_url` / escrita). */
export function siteIconUrl(presskitLogoUrls: unknown, logoUrl?: string | null): string {
  const v = parsePresskitLogoVariants(presskitLogoUrls, logoUrl);
  return (
    v.icon_clara?.trim() ||
    v.icon_escura?.trim() ||
    DEFAULT_SITE_LOGO
  );
}

/** Legacy `logo_url` column — escrita only (nunca o ícone triângulo). */
export function primaryPresskitLogoUrl(
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

export const PRESSKIT_LOGO_CANVAS_CLASS = "presskit-logo-canvas";

/** Admin preview only — escuras sem fallback (evita wordmark branca “invisível”). */
export function presskitSlotPreviewFallback(key: PresskitLogoSlotKey): string | null {
  switch (key) {
    case "escrita_clara":
      return DEFAULT_SITE_WORDMARK;
    case "icon_clara":
      return DEFAULT_SITE_LOGO;
    case "escrita_escura":
    case "icon_escura":
      return null;
    default: {
      const _never: never = key;
      return _never;
    }
  }
}

export { DEFAULT_SITE_LOGO };