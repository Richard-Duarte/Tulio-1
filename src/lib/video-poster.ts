import { parseYoutubeId } from "./link-metadata.ts";

export type VideoPosterSource = {
  kind?: string;
  poster_url?: string | null;
  public_url?: string | null;
  embed_url?: string | null;
  source_type?: string | null;
  external_provider?: string | null;
  external_id?: string | null;
};

function vimeoIdFromUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!url.hostname.replace(/^www\./, "").includes("vimeo.com")) return null;
    const id = url.pathname.split("/").filter(Boolean).pop();
    return id && /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function youtubeThumbnail(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Best-effort poster URL for gallery/presskit tiles (DB value or platform default). */
export function resolveVideoPosterUrl(row: VideoPosterSource): string | null {
  if (row.poster_url) return row.poster_url;

  const youtubeId =
    (row.external_provider === "youtube" ? row.external_id : null) ??
    parseYoutubeId(row.public_url ?? "") ??
    parseYoutubeId(row.embed_url ?? "");
  if (youtubeId) return youtubeThumbnail(youtubeId);

  const vimeoId =
    (row.external_provider === "vimeo" ? row.external_id : null) ??
    vimeoIdFromUrl(row.public_url ?? "") ??
    vimeoIdFromUrl(row.embed_url ?? "");
  if (vimeoId) return `https://vumbnail.com/${vimeoId}.jpg`;

  return null;
}

function seekFrame(video: HTMLVideoElement, atSeconds: number, onFrame: () => void, onError: (e: Error) => void) {
  video.onerror = () => onError(new Error("video load failed"));
  video.onloadeddata = () => {
    const t = Number.isFinite(video.duration)
      ? Math.min(Math.max(atSeconds, 0), Math.max(0, video.duration - 0.05))
      : atSeconds;
    video.currentTime = t;
  };
  video.onseeked = () => {
    try {
      onFrame();
    } catch (e) {
      onError(e instanceof Error ? e : new Error("frame capture failed"));
    }
  };
}

function frameToWebpBlob(video: HTMLVideoElement): Promise<Blob> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return Promise.reject(new Error("no video dimensions"));
  const canvas = document.createElement("canvas");
  const max = 1280;
  const scale = Math.min(1, max / Math.max(w, h));
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("canvas unsupported"));
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("poster encode failed"))),
      "image/webp",
      0.82,
    );
  });
}

/** First frame from a local file (admin upload). */
export function captureVideoPosterFromFile(file: File, atSeconds = 0.25): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const finish = (err?: Error) => {
      URL.revokeObjectURL(objectUrl);
      video.src = "";
      if (err) reject(err);
    };
    seekFrame(
      video,
      atSeconds,
      () => {
        void frameToWebpBlob(video)
          .then((blob) => {
            finish();
            resolve(blob);
          })
          .catch((e) => finish(e));
      },
      finish,
    );
    video.src = objectUrl;
  });
}