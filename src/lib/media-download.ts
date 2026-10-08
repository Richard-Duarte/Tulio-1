/**
 * Client-side helpers to download media files without navigating away.
 *
 * Photos are served either from Lovable's asset CDN (`/__l5e/assets-v1/...`, same
 * origin, CORS `*`) or potentially from Supabase Storage. A plain `<a download>`
 * is ignored by browsers for cross-origin URLs, so files are fetched as blobs and
 * saved through an object URL. If fetching fails (e.g. CORS), we fall back to a
 * direct link (with Supabase's `?download=` hint when applicable).
 */

export type DownloadableMedia = { id: string; title: string; public_url: string | null };

const EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/avif": "avif",
  "image/gif": "gif",
  "video/mp4": "mp4",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Builds a sensible filename such as `jula-gigs-01.webp`. */
export function mediaFilename(item: DownloadableMedia, mimeType?: string) {
  const path = (item.public_url ?? "").split(/[?#]/)[0] ?? "";
  const base = decodeURIComponent(path.split("/").pop() ?? "");
  const dot = base.lastIndexOf(".");
  const urlExt = dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
  const ext = urlExt || (mimeType ? EXTENSIONS[mimeType.split(";")[0]!.trim()] : "") || "jpg";
  const stem = slugify(dot > 0 ? base.slice(0, dot) : base) || slugify(item.title) || item.id;
  return `${stem.startsWith("jula") ? stem : `jula-${stem}`}.${ext}`;
}

function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before releasing memory.
  window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

function directDownload(url: string, filename: string) {
  let href = url;
  if (href.includes("/storage/v1/object/public/")) {
    const u = new URL(href, window.location.href);
    u.searchParams.set("download", filename);
    href = u.toString();
  }
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function fetchBlob(url: string) {
  const res = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

/** Downloads a single file. Falls back to a direct link if the fetch fails. */
export async function downloadMedia(item: DownloadableMedia) {
  if (!item.public_url) throw new Error("Missing URL");
  try {
    const blob = await fetchBlob(item.public_url);
    saveBlob(blob, mediaFilename(item, blob.type));
  } catch {
    directDownload(item.public_url, mediaFilename(item));
  }
}

export type ZipProgress = { done: number; total: number };

/**
 * Fetches all files (with limited concurrency) and bundles them into a ZIP
 * generated in the browser. Images are already compressed, so entries are
 * stored without re-compression (fast, low CPU). Returns the number of files
 * that failed to download; throws if none could be fetched.
 */
export async function downloadMediaZip(
  items: DownloadableMedia[],
  zipName: string,
  onProgress?: (progress: ZipProgress) => void,
) {
  const { zipSync } = await import("fflate");
  const files: Record<string, Uint8Array> = {};
  const used = new Set<string>();
  const total = items.length;
  let done = 0;
  let failed = 0;
  onProgress?.({ done, total });

  const uniqueName = (name: string) => {
    if (!used.has(name)) return (used.add(name), name);
    const dot = name.lastIndexOf(".");
    for (let i = 2; ; i++) {
      const candidate = `${name.slice(0, dot)}-${i}${name.slice(dot)}`;
      if (!used.has(candidate)) return (used.add(candidate), candidate);
    }
  };

  const queue = [...items];
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      try {
        if (!item.public_url) throw new Error("Missing URL");
        const blob = await fetchBlob(item.public_url);
        files[uniqueName(mediaFilename(item, blob.type))] = new Uint8Array(
          await blob.arrayBuffer(),
        );
      } catch {
        failed++;
      }
      onProgress?.({ done: ++done, total });
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, total) }, worker));

  if (Object.keys(files).length === 0) throw new Error("No files could be downloaded");
  const zipped = zipSync(files, { level: 0 });
  saveBlob(new Blob([zipped as BlobPart], { type: "application/zip" }), zipName);
  return { failed };
}
