import { parsePresskitLogoUrls, presskitDisplayLogoUrl } from "./presskit-logo-urls";

export { parsePresskitLogoUrls, presskitDisplayLogoUrl };

function filenameFromUrl(url: string, index: number): string {
  try {
    const path = new URL(url, "https://local.invalid").pathname;
    const base = path.split("/").pop() ?? "";
    if (/\.(png|jpe?g|webp|svg)$/i.test(base)) return base;
  } catch {
    /* fall through */
  }
  return `tulio-logo-${index + 1}.png`;
}

export async function downloadPresskitLogosZip(urls: string[], zipName = "tulio-logos.zip") {
  const list = urls.map((u) => u.trim()).filter(Boolean);
  if (list.length === 0) throw new Error("No logos");
  if (list.length === 1) {
    // Fetch as blob: the `download` attribute is ignored for cross-origin URLs.
    const res = await fetch(list[0]!);
    if (!res.ok) throw new Error(`Failed to fetch ${list[0]}`);
    const objectUrl = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filenameFromUrl(list[0]!, 0);
    a.rel = "noopener";
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    return;
  }
  const { zipSync } = await import("fflate");
  const files: Record<string, Uint8Array> = {};
  const used = new Set<string>();
  for (let i = 0; i < list.length; i++) {
    const url = list[i]!;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    let name = filenameFromUrl(url, i);
    while (used.has(name)) name = `tulio-logo-${i + 1}-${name}`;
    used.add(name);
    files[name] = new Uint8Array(await res.arrayBuffer());
  }
  const zipped = zipSync(files, { level: 0 });
  const blob = new Blob([zipped as BlobPart], { type: "application/zip" });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = zipName;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}