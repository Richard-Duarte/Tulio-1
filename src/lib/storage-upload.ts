import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "site-media";
const CHUNK_BYTES = 6 * 1024 * 1024;
/** Supabase recommends TUS above ~6 MB; required for reliable multi‑GB uploads. */
const TUS_MIN_BYTES = 6 * 1024 * 1024;

function requireEnv(name: "VITE_SUPABASE_PROJECT_ID" | "VITE_SUPABASE_PUBLISHABLE_KEY") {
  const value = import.meta.env[name];
  if (!value) throw new Error("Supabase não configurado.");
  return value;
}

export async function uploadSiteMediaFile(
  file: File,
  path: string,
  onProgress?: (ratio: number) => void,
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sessão expirada. Entre de novo no painel.");

  const contentType = file.type || "application/octet-stream";

  if (file.size <= TUS_MIN_BYTES) {
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw error;
    onProgress?.(1);
    return;
  }

  const projectId = requireEnv("VITE_SUPABASE_PROJECT_ID");
  const apikey = requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY");

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        apikey,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BUCKET,
        objectName: path,
        contentType,
        cacheControl: "31536000",
      },
      chunkSize: CHUNK_BYTES,
      onError: (error) => reject(error),
      onProgress: (uploaded, total) => {
        if (total > 0) onProgress?.(uploaded / total);
      },
      onSuccess: () => resolve(),
    });

    void upload.findPreviousUploads().then((previous) => {
      const resume = previous[0];
      if (resume) upload.resumeFromPreviousUpload(resume);
      upload.start();
    });
  });
}
