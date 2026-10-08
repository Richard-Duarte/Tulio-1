const NON_WEB_VIDEO_EXT = new Set([
  "mov",
  "mkv",
  "avi",
  "webm",
  "m4v",
  "hevc",
  "qt",
  "3gp",
  "3g2",
  "wmv",
  "flv",
]);

/** Vídeos acima disso são convertidos no servidor (Vercel + FFmpeg). */
export const BROWSER_TRANSCODE_MAX_BYTES = 380 * 1024 * 1024;

export function fileExtension(name: string) {
  const part = name.split(".").pop();
  return (part ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isVideoFile(file: File) {
  return file.type.startsWith("video/");
}

/** MP4 H.264+AAC passa direto; demais formatos são convertidos na subida. */
export function needsVideoTranscode(file: File) {
  if (!isVideoFile(file)) return false;
  const ext = fileExtension(file.name);
  if (NON_WEB_VIDEO_EXT.has(ext)) return true;
  if (file.type === "video/quicktime") return true;
  if (file.type !== "video/mp4" && ext !== "mp4") return true;
  return false;
}
