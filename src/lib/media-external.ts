import { parseYoutubeId, youtubeWatchUrl } from "./link-metadata.ts";

export type MediaSourceType = "storage" | "external";

export type ExternalProvider = "youtube" | "vimeo" | "direct" | "other";

export type ResolvedExternalMedia = {
  source_type: "external";
  external_provider: ExternalProvider;
  external_id: string | null;
  kind: "image" | "video";
  public_url: string;
  poster_url: string | null;
  embed_url: string | null;
  title: string;
  storage_bucket: string;
  storage_path: string;
};

const DIRECT_IMAGE = /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i;
const DIRECT_VIDEO = /\.(mp4|webm|mov)(\?.*)?$/i;

function parseVimeoId(input: string): string | null {
  const raw = input.trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!url.hostname.replace(/^www\./, "").includes("vimeo.com")) return null;
  const id = url.pathname.split("/").filter(Boolean).pop();
  return id && /^\d+$/.test(id) ? id : null;
}

export function resolveExternalMediaUrl(input: string, title?: string): ResolvedExternalMedia | null {
  const raw = input.trim();
  if (!raw) return null;

  const youtubeId = parseYoutubeId(raw);
  if (youtubeId) {
    const watch = youtubeWatchUrl(youtubeId);
    return {
      source_type: "external",
      external_provider: "youtube",
      external_id: youtubeId,
      kind: "video",
      public_url: watch,
      poster_url: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      embed_url: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`,
      title: title?.trim() || `YouTube ${youtubeId}`,
      storage_bucket: "site-media",
      storage_path: "",
    };
  }

  const vimeoId = parseVimeoId(raw);
  if (vimeoId) {
    const page = `https://vimeo.com/${vimeoId}`;
    return {
      source_type: "external",
      external_provider: "vimeo",
      external_id: vimeoId,
      kind: "video",
      public_url: page,
      poster_url: `https://vumbnail.com/${vimeoId}.jpg`,
      embed_url: `https://player.vimeo.com/video/${vimeoId}`,
      title: title?.trim() || `Vimeo ${vimeoId}`,
      storage_bucket: "site-media",
      storage_path: "",
    };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const path = url.pathname;
  if (DIRECT_IMAGE.test(path)) {
    return {
      source_type: "external",
      external_provider: "direct",
      external_id: null,
      kind: "image",
      public_url: raw,
      poster_url: null,
      embed_url: null,
      title: title?.trim() || path.split("/").pop() || "Imagem",
      storage_bucket: "site-media",
      storage_path: "",
    };
  }
  if (DIRECT_VIDEO.test(path)) {
    return {
      source_type: "external",
      external_provider: "direct",
      external_id: null,
      kind: "video",
      public_url: raw,
      poster_url: null,
      embed_url: null,
      title: title?.trim() || path.split("/").pop() || "Vídeo",
      storage_bucket: "site-media",
      storage_path: "",
    };
  }

  return {
    source_type: "external",
    external_provider: "other",
    external_id: null,
    kind: "video",
    public_url: raw,
    poster_url: null,
    embed_url: null,
    title: title?.trim() || "Link externo",
    storage_bucket: "site-media",
    storage_path: "",
  };
}

export function isEmbedVideo(
  row: { source_type?: string | null; external_provider?: string | null; external_id?: string | null },
) {
  if (row.source_type !== "external") return false;
  return row.external_provider === "youtube" || row.external_provider === "vimeo";
}

export function embedSrc(row: {
  external_provider?: string | null;
  external_id?: string | null;
  embed_url?: string | null;
}) {
  if (row.embed_url) return row.embed_url;
  if (row.external_provider === "youtube" && row.external_id) {
    return `https://www.youtube-nocookie.com/embed/${row.external_id}?rel=0&modestbranding=1&playsinline=1`;
  }
  if (row.external_provider === "vimeo" && row.external_id) {
    return `https://player.vimeo.com/video/${row.external_id}`;
  }
  return null;
}
