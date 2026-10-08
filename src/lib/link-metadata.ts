/**
 * Link metadata helpers used by the admin autofill (SoundCloud sets / YouTube live sets).
 * Server-only in practice (called from server functions, so no CORS), but free of Node APIs.
 */

export type DateSource =
  "title" | "release_date" | "display_date" | "created_at" | "publish_date" | "upload_date";

export type LinkMetadata = {
  url: string;
  title: string;
  coverUrl: string | null;
  date: string | null;
  dateSource: DateSource | null;
  /** Date reported by the platform, even when a date found in the title was preferred. */
  platformDate: string | null;
  durationSeconds: number | null;
  description: string | null;
};

export type YoutubeMetadata = LinkMetadata & { youtubeId: string };

const TIME_ZONE = "America/Sao_Paulo";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

async function get(url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
    headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9", ...init?.headers },
  });
}

/** ISO timestamp (with or without offset) -> YYYY-MM-DD in the artist's time zone. */
export function toLocalDate(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  janeiro: 1,
  feb: 2,
  february: 2,
  febuary: 2,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  march: 3,
  marco: 3,
  março: 3,
  apr: 4,
  april: 4,
  abr: 4,
  abril: 4,
  may: 5,
  mai: 5,
  maio: 5,
  jun: 6,
  june: 6,
  junho: 6,
  jul: 7,
  july: 7,
  julho: 7,
  aug: 8,
  august: 8,
  ago: 8,
  agosto: 8,
  sep: 9,
  sept: 9,
  september: 9,
  set: 9,
  setembro: 9,
  oct: 10,
  october: 10,
  out: 10,
  outubro: 10,
  nov: 11,
  november: 11,
  novembro: 11,
  dec: 12,
  december: 12,
  dez: 12,
  dezembro: 12,
};

function validDate(y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d)
    return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Finds a full, unambiguous event date (year + month + day) written in a title, e.g.
 * "FEBUARY 2ND 2025", "JULY 18TH 2026", "18 de julho de 2026", "2026-07-18". Returns null otherwise.
 */
export function dateFromTitle(title: string): string | null {
  const text = title.toLowerCase();
  const month = "([a-zçã]{3,9})\\.?";
  const day = "(\\d{1,2})(?:st|nd|rd|th|º)?";
  const year = "((?:19|20)\\d{2})";
  const month_ = (name: string | undefined) => (name ? MONTHS[name] : undefined);
  const english = new RegExp(`\\b${month}\\s+${day},?\\s+${year}\\b`).exec(text);
  const englishMonth = month_(english?.[1]);
  if (english && englishMonth)
    return validDate(Number(english[3]), englishMonth, Number(english[2]));
  const dayFirst = new RegExp(`\\b${day}\\s+(?:de\\s+)?${month}\\s+(?:de\\s+)?${year}\\b`).exec(
    text,
  );
  const dayFirstMonth = month_(dayFirst?.[2]);
  if (dayFirst && dayFirstMonth)
    return validDate(Number(dayFirst[3]), dayFirstMonth, Number(dayFirst[1]));
  const iso = /\b((?:19|20)\d{2})-(\d{2})-(\d{2})\b/.exec(text);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  return null;
}

// ---------------------------------------------------------------- SoundCloud

/** Validates a SoundCloud track URL and returns it without query/hash/trailing slash. */
export function normalizeSoundcloudUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Link inválido.");
  }
  const host = url.hostname.replace(/^(www|m)\./, "");
  if (host !== "soundcloud.com" && host !== "on.soundcloud.com")
    throw new Error("Use um link do soundcloud.com.");
  const path = url.pathname.replace(/\/+$/, "");
  if (host === "soundcloud.com" && path.split("/").filter(Boolean).length < 2)
    throw new Error("Use o link de uma faixa/set do SoundCloud.");
  return `https://${host}${path}`;
}

type ScSound = {
  title?: string;
  artwork_url?: string | null;
  release_date?: string | null;
  display_date?: string | null;
  created_at?: string | null;
  duration?: number | null;
  description?: string | null;
  permalink_url?: string | null;
  user?: { avatar_url?: string | null };
};

const hiRes = (url: string | null | undefined) =>
  url ? url.replace(/-(large|t\d+x\d+|crop|original)\.(jpg|png)$/, "-t500x500.$2") : null;

export async function fetchSoundcloudMetadata(input: string): Promise<LinkMetadata> {
  let url = normalizeSoundcloudUrl(input);
  let sound: ScSound | undefined;
  try {
    const res = await get(url);
    if (res.ok) {
      url = normalizeSoundcloudUrl(res.url || url); // resolves on.soundcloud.com short links
      const html = await res.text();
      const match = html.match(/window\.__sc_hydration\s*=\s*(\[.*?\]);\s*<\/script>/s);
      if (match?.[1]) {
        const data = JSON.parse(match[1]) as { hydratable: string; data: ScSound }[];
        sound = data.find((item) => item.hydratable === "sound")?.data;
      }
    }
  } catch {
    // fall back to oEmbed below
  }
  if (sound?.permalink_url) url = normalizeSoundcloudUrl(sound.permalink_url);

  let oembed: { title?: string; author_name?: string; thumbnail_url?: string } | undefined;
  if (!sound?.title || !(sound.artwork_url || sound.user?.avatar_url)) {
    try {
      const res = await get(
        `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`,
      );
      if (res.ok) oembed = await res.json();
    } catch {
      // ignore
    }
  }
  const oembedTitle =
    oembed?.title && oembed.author_name && oembed.title.endsWith(` by ${oembed.author_name}`)
      ? oembed.title.slice(0, -` by ${oembed.author_name}`.length)
      : oembed?.title;
  const title = sound?.title ?? oembedTitle;
  if (!title)
    throw new Error("Não foi possível ler este link do SoundCloud (privado ou removido?).");

  const oembedThumb = oembed?.thumbnail_url?.includes("placeholder") ? null : oembed?.thumbnail_url;
  const coverUrl =
    hiRes(sound?.artwork_url) ?? hiRes(oembedThumb) ?? hiRes(sound?.user?.avatar_url);

  const platform: [DateSource, string | null][] = [
    ["release_date", toLocalDate(sound?.release_date)],
    ["display_date", toLocalDate(sound?.display_date)],
    ["created_at", toLocalDate(sound?.created_at)],
  ];
  const [platformSource, platformDate] = platform.find(([, d]) => d) ?? [null, null];
  const titleDate = dateFromTitle(title);

  return {
    url,
    title,
    coverUrl,
    date: titleDate ?? platformDate,
    dateSource: titleDate ? "title" : platformSource,
    platformDate,
    durationSeconds: sound?.duration ? Math.round(sound.duration / 1000) : null,
    description: sound?.description?.trim() || null,
  };
}

// ---------------------------------------------------------------- YouTube

/** Extracts the 11-char video id from watch?v=, youtu.be, /live/, /shorts/, /embed/ URLs. */
export function parseYoutubeId(input: string): string | null {
  const raw = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  const valid = (id: string | null | undefined) =>
    id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  if (host === "youtu.be") return valid(url.pathname.split("/")[1]);
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;
  if (url.pathname === "/watch") return valid(url.searchParams.get("v"));
  const [, kind, id] = url.pathname.split("/");
  if (kind && ["live", "shorts", "embed", "v"].includes(kind)) return valid(id);
  return null;
}

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

function isoDuration(value: string | undefined) {
  const m = value?.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  return (+(m[1] ?? 0) * 24 + +(m[2] ?? 0)) * 3600 + +(m[3] ?? 0) * 60 + +(m[4] ?? 0);
}

async function bestThumbnail(id: string) {
  const maxres = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  try {
    const res = await get(maxres, { method: "HEAD" });
    if (res.ok) return maxres;
  } catch {
    // ignore
  }
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function jsonString(html: string, key: string) {
  const m = html.match(new RegExp(`"${key}":"((?:[^"\\\\]|\\\\.)*)"`));
  if (!m) return null;
  try {
    return JSON.parse(`"${m[1]}"`) as string;
  } catch {
    return null;
  }
}

export async function fetchYoutubeMetadata(input: string): Promise<YoutubeMetadata> {
  const id = parseYoutubeId(input);
  if (!id) throw new Error("Use um link de vídeo do YouTube (youtube.com ou youtu.be).");
  const url = youtubeWatchUrl(id);

  let title: string | null = null;
  let published: string | null = null;
  let publishedSource: DateSource | null = null;
  let durationSeconds: number | null = null;
  let description: string | null = null;

  const apiKey = process.env["YOUTUBE_API_KEY"];
  if (apiKey) {
    try {
      const res = await get(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${id}&key=${encodeURIComponent(apiKey)}`,
      );
      const item = res.ok ? (await res.json()).items?.[0] : undefined;
      if (item) {
        title = item.snippet?.title ?? null;
        published = item.snippet?.publishedAt ?? null;
        publishedSource = published ? "publish_date" : null;
        durationSeconds = isoDuration(item.contentDetails?.duration);
        description = item.snippet?.description ?? null;
      }
    } catch {
      // fall back to scraping
    }
  }

  if (!title || !published) {
    const [oembed, page] = await Promise.all([
      get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null) as Promise<{ title?: string } | null>,
      get(`${url}&hl=en&persist_hl=1`, { headers: { cookie: "CONSENT=YES+1; SOCS=CAI" } })
        .then((r) => (r.ok ? r.text() : ""))
        .catch(() => ""),
    ]);
    title ??= oembed?.title ?? jsonString(page, "title");
    const publishDate =
      jsonString(page, "publishDate") ??
      page.match(/itemprop="datePublished" content="([^"]+)"/)?.[1] ??
      null;
    const uploadDate =
      jsonString(page, "uploadDate") ??
      page.match(/itemprop="uploadDate" content="([^"]+)"/)?.[1] ??
      null;
    if (!published) {
      published = publishDate ?? uploadDate;
      publishedSource = publishDate ? "publish_date" : uploadDate ? "upload_date" : null;
    }
    durationSeconds ??= Number(jsonString(page, "lengthSeconds")) || null;
    description ??= jsonString(page, "shortDescription");
  }
  if (!title) throw new Error("Não foi possível ler este vídeo (privado ou removido?).");

  const platformDate = toLocalDate(published);
  const titleDate = dateFromTitle(title);
  return {
    url,
    youtubeId: id,
    title,
    coverUrl: await bestThumbnail(id),
    date: titleDate ?? platformDate,
    dateSource: titleDate ? "title" : platformDate ? publishedSource : null,
    platformDate,
    durationSeconds,
    description: description?.trim() || null,
  };
}

// ---------------------------------------------------------------------------------------------
// Generic page metadata (ticketing links for "Próximas datas"): og:image / twitter:image, title
// and, when present, the JSON-LD Event (or embedded JSON, e.g. Sympla's __NEXT_DATA__) start
// date and venue. Arbitrary URLs, so redirects are followed manually and internal hosts refused.
// ---------------------------------------------------------------------------------------------

export type PageMetadata = {
  finalUrl: string;
  image: string | null;
  title: string | null;
  description: string | null;
  /** YYYY-MM-DD in the event's local time, when the page declares it. */
  date: string | null;
  /** HH:MM, when the page declares a start time. */
  time: string | null;
  venue: string | null;
  city: string | null;
};

const PAGE_MAX_BYTES = 1_500_000;
const PAGE_TIMEOUT_MS = 8_000;
const PAGE_MAX_REDIRECTS = 5;

/** Rejects obviously internal targets. (Cloudflare Workers can't reach private networks anyway.) */
function assertPublicHttpUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Link inválido.");
  if (url.username || url.password) throw new Error("Link inválido.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const privateHost =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host) ||
    host === "::1" ||
    /^f[cd][0-9a-f]{2}:/.test(host) ||
    /^fe80:/.test(host) ||
    /^::ffff:/.test(host) ||
    (!host.includes(".") && !host.includes(":"));
  if (privateHost) throw new Error("Link inválido.");
  return url;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};
function decodeEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

function attr(tag: string, name: string) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? decodeEntities((m[2] ?? m[3] ?? m[4] ?? "").trim()) : null;
}

function metaTags(html: string) {
  const out = new Map<string, string>();
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (
      attr(tag, "property") ??
      attr(tag, "name") ??
      attr(tag, "itemprop")
    )?.toLowerCase();
    const content = attr(tag, "content");
    if (key && content && !out.has(key)) out.set(key, content);
  }
  return out;
}

function resolveUrl(value: string | null | undefined, base: string) {
  if (!value) return null;
  try {
    const u = new URL(value.trim(), base);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const isObj = (v: Json | undefined): v is { [key: string]: Json } =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: Json | undefined) => (typeof v === "string" && v.trim() ? v.trim() : null);

function findEvent(node: Json | undefined, depth = 0): { [key: string]: Json } | null {
  if (!node || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findEvent(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (!isObj(node)) return null;
  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.some((t) => typeof t === "string" && /Event$/.test(t))) return node;
  return findEvent(node["@graph"], depth + 1);
}

/**
 * Fallback for apps that embed their data as JSON (e.g. Next.js `__NEXT_DATA__`
 * on Sympla): finds the first object with a string `name` and `startDate`.
 */
function findStartDateObject(node: Json | undefined, depth = 0): { [key: string]: Json } | null {
  if (!node || depth > 14 || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node.slice(0, 50)) {
      const found = findStartDateObject(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (str(node["name"]) && str(node["startDate"] ?? node["start_date"])) return node;
  for (const value of Object.values(node)) {
    const found = findStartDateObject(value, depth + 1);
    if (found) return found;
  }
  return null;
}

/** Venue/city from a schema.org location or a similar nested address object. */
function placeOf(obj: { [key: string]: Json } | null) {
  if (!obj) return { venue: null, city: null };
  const candidates = [
    obj["location"],
    obj["eventsAddress"],
    obj["venue"],
    obj["place"],
    obj["address"],
  ]
    .map((v) => (Array.isArray(v) ? v[0] : v))
    .filter(isObj);
  for (const loc of candidates) {
    const address = loc["address"];
    const city =
      str(loc["city"]) ??
      str(loc["addressLocality"]) ??
      (isObj(address) ? (str(address["addressLocality"]) ?? str(address["city"])) : null);
    const venue = str(loc["name"]);
    if (venue || city) return { venue, city };
  }
  return { venue: null, city: null };
}

function imageFromJsonLd(value: Json | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return imageFromJsonLd(value[0]);
  if (isObj(value)) return str(value["url"]) ?? str(value["contentUrl"]);
  return null;
}

/** Parses the date/time *as written* (keeps the event's local wall-clock time). */
function splitIsoDate(value: string | null) {
  if (!value) return { date: null, time: null };
  if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    const instant = new Date(value);
    if (!Number.isNaN(instant.getTime())) {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(instant);
      const part = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((item) => item.type === type)?.value ?? "";
      return {
        date: `${part("year")}-${part("month")}-${part("day")}`,
        time: `${part("hour")}:${part("minute")}`,
      };
    }
  }
  const m = value.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/);
  return m ? { date: m[1] ?? null, time: m[2] ?? null } : { date: null, time: null };
}

export function parsePageMetadata(html: string, finalUrl: string): PageMetadata {
  const meta = metaTags(html);
  let event: { [key: string]: Json } | null = null;
  for (const [, body] of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      event = findEvent(JSON.parse(body!.trim()) as Json);
    } catch {
      /* ignore malformed JSON-LD */
    }
    if (event) break;
  }
  if (!event) {
    for (const [, body] of html.matchAll(
      /<script\b[^>]*type\s*=\s*["']?application\/json["']?[^>]*>([\s\S]*?)<\/script>/gi,
    )) {
      try {
        event = findStartDateObject(JSON.parse(body!.trim()) as Json);
      } catch {
        /* ignore */
      }
      if (event) break;
    }
  }
  const { venue, city } = placeOf(event);
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const { date, time } = splitIsoDate(
    event ? (str(event["startDate"]) ?? str(event["start_date"])) : null,
  );

  const image =
    resolveUrl(meta.get("og:image:secure_url"), finalUrl) ??
    resolveUrl(meta.get("og:image"), finalUrl) ??
    resolveUrl(meta.get("og:image:url"), finalUrl) ??
    resolveUrl(meta.get("twitter:image"), finalUrl) ??
    resolveUrl(meta.get("twitter:image:src"), finalUrl) ??
    resolveUrl(event ? imageFromJsonLd(event["image"]) : null, finalUrl);

  const clean = (v: string | null | undefined) =>
    v ? decodeEntities(v).replace(/\s+/g, " ").trim() || null : null;

  const eventDescription = event ? str(event["description"]) : null;

  return {
    finalUrl,
    image,
    title:
      clean(event ? str(event["name"]) : null) ??
      clean(meta.get("og:title")) ??
      clean(meta.get("twitter:title")) ??
      clean(titleTag),
    description:
      clean(eventDescription) ??
      clean(meta.get("og:description")) ??
      clean(meta.get("description")) ??
      clean(meta.get("twitter:description")),
    date,
    time,
    venue: clean(venue),
    city: clean(city),
  };
}

async function readLimited(res: Response) {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.byteLength;
    // The <head> is what we need; stop early on huge pages.
    if (size >= PAGE_MAX_BYTES) {
      await reader.cancel().catch(() => {});
      break;
    }
  }
  const buf = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c.subarray(0, Math.min(c.byteLength, size - offset)), offset);
    offset += c.byteLength;
    if (offset >= size) break;
  }
  return new TextDecoder("utf-8").decode(buf);
}

export async function fetchPageMetadata(rawUrl: string): Promise<PageMetadata> {
  let url = assertPublicHttpUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
  try {
    for (let i = 0; ; i++) {
      const res = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          // Many ticketing sites only render OpenGraph tags for crawlers/browsers.
          "user-agent": UA,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        if (i >= PAGE_MAX_REDIRECTS) throw new Error("Muitos redirecionamentos.");
        url = assertPublicHttpUrl(new URL(res.headers.get("location")!, url).toString());
        await res.body?.cancel().catch(() => {});
        continue;
      }
      if (!res.ok) {
        if (res.status === 403 && /(^|\.)ingresse\.com$/i.test(url.hostname)) {
          await res.body?.cancel().catch(() => {});
          return fetchIngresseMirrorMetadata(url);
        }
        throw new Error(`A página respondeu ${res.status}.`);
      }
      const type = res.headers.get("content-type") ?? "";
      if (type && !/html|xml/i.test(type)) throw new Error("O link não é uma página HTML.");
      return parsePageMetadata(await readLimited(res), url.toString());
    }
  } finally {
    clearTimeout(timer);
  }
}

const ROLEBOM_CITIES = [
  "rio-de-janeiro",
  "sao-paulo",
  "belo-horizonte",
  "brasilia",
  "curitiba",
  "porto-alegre",
  "salvador",
  "recife",
  "florianopolis",
  "goiania",
] as const;

/**
 * Ingresse protects event HTML with a Cloudflare challenge. Rolebom indexes the same public
 * Ingresse catalog and exposes schema.org metadata, including the original poster and ticket URL.
 */
async function fetchIngresseMirrorMetadata(original: URL): Promise<PageMetadata> {
  const slug = original.pathname.split("/").filter(Boolean).at(-1);
  if (!slug) throw new Error("Link da Ingresse inválido.");

  for (const city of ROLEBOM_CITIES) {
    const mirror = `https://rolebom.com/en/${city}/events/${encodeURIComponent(slug)}`;
    try {
      const res = await get(mirror, { headers: { Accept: "text/html" } });
      if (!res.ok) continue;
      const html = await res.text();
      if (!html.includes('"@type":"Event"') && !html.includes('"@type": "Event"')) continue;
      const metadata = parsePageMetadata(html, mirror);
      const originalPoster =
        html.match(/https:\/\/kraken\.ingresse\.com\/event\/posters\/[^"\\]+/i)?.[0] ?? null;
      return {
        ...metadata,
        finalUrl: original.toString(),
        image: originalPoster
          ? decodeEntities(originalPoster.replace(/\\u0026/g, "&"))
          : metadata.image,
      };
    } catch {
      // Try the next indexed city.
    }
  }
  throw new Error(
    "A Ingresse bloqueou a leitura e o evento ainda não foi encontrado no catálogo público.",
  );
}
