import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegStatic from "ffmpeg-static";

const BUCKET = "site-media";

function ffmpegBinary() {
  if (!ffmpegStatic) throw new Error("FFmpeg não disponível neste ambiente.");
  return ffmpegStatic;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = ffmpegBinary();
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim().slice(-2000) || `FFmpeg saiu com código ${code}`));
    });
  });
}

async function probeInput(inputUrl: string) {
  const bin = ffmpegBinary();
  return new Promise<{ video: string; audio: string }>((resolve, reject) => {
    const child = spawn(bin, ["-hide_banner", "-i", inputUrl], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", () => {
      const video = /Video:\s*(\w+)/i.exec(stderr)?.[1]?.toLowerCase() ?? "";
      const audio = /Audio:\s*(\w+)/i.exec(stderr)?.[1]?.toLowerCase() ?? "";
      if (!video && !audio) {
        reject(new Error("Não foi possível ler o vídeo para conversão."));
        return;
      }
      resolve({ video, audio });
    });
  });
}

function canStreamCopy(codecs: { video: string; audio: string }) {
  const h264 = codecs.video === "h264" || codecs.video === "avc1";
  const aac = !codecs.audio || codecs.audio === "aac" || codecs.audio === "mp4a";
  return h264 && aac;
}

export async function transcodeStorageVideo(
  supabaseAdmin: {
    storage: {
      from: (bucket: string) => {
        createSignedUrl: (
          path: string,
          expiresIn: number,
        ) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
        upload: (
          path: string,
          body: Blob | Buffer,
          opts: { contentType: string; cacheControl: string; upsert: boolean },
        ) => Promise<{ error: unknown }>;
        remove: (paths: string[]) => Promise<{ error: unknown }>;
      };
    };
  },
  sourcePath: string,
  destPath: string,
) {
  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(sourcePath, 60 * 60);
  if (signError || !signed?.signedUrl) {
    throw signError ?? new Error("URL assinada indisponível para conversão.");
  }

  const outFile = join(tmpdir(), `jula-video-${randomUUID()}.mp4`);
  try {
    const codecs = await probeInput(signed.signedUrl);
    const copy = canStreamCopy(codecs);
    const args = copy
      ? ["-y", "-i", signed.signedUrl, "-c", "copy", "-movflags", "+faststart", outFile]
      : codecs.audio
        ? [
            "-y",
            "-i",
            signed.signedUrl,
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
            outFile,
          ]
        : [
            "-y",
            "-i",
            signed.signedUrl,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-an",
            "-movflags",
            "+faststart",
            outFile,
          ];
    await runFfmpeg(args);

    const body = await readFile(outFile);
    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(destPath, body, {
      contentType: "video/mp4",
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) throw uploadError;
  } finally {
    await unlink(outFile).catch(() => undefined);
    await supabaseAdmin.storage.from(BUCKET).remove([sourcePath]).catch(() => undefined);
  }

  return { destPath };
}
