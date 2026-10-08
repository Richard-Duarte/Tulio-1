import { needsVideoTranscode } from "@/lib/video-web";

let ffmpegReady: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | undefined;

async function getFfmpeg() {
  if (!ffmpegReady) {
    ffmpegReady = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();
      const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })();
  }
  return ffmpegReady;
}

export async function transcodeVideoInBrowser(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<File> {
  if (!needsVideoTranscode(file)) return file;

  const { fetchFile } = await import("@ffmpeg/util");
  const ffmpeg = await getFfmpeg();
  const onFfmpegProgress = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress)) onProgress?.(Math.min(1, Math.max(0, progress)));
  };
  ffmpeg.on("progress", onFfmpegProgress);
  const inputName = "upload-input";
  const outputName = "upload-output.mp4";

  await ffmpeg.writeFile(inputName, await fetchFile(file));
  try {
    await ffmpeg.exec([
      "-i",
      inputName,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-movflags",
      "+faststart",
      outputName,
    ]);
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data as BlobPart], { type: "video/mp4" });
    const base = file.name.replace(/\.[^.]+$/, "") || "video";
    return new File([blob], `${base}.mp4`, { type: "video/mp4" });
  } finally {
    ffmpeg.off("progress", onFfmpegProgress);
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {
      /* ignore */
    }
    try {
      await ffmpeg.deleteFile(outputName);
    } catch {
      /* ignore */
    }
  }
}
