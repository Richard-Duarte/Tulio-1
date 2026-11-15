export type MediaFormatFields = {
  kind: string;
  source_type?: string | null;
  external_provider?: string | null;
  storage_path?: string | null;
  public_url?: string | null;
};

function extensionFromUrl(path: string) {
  const clean = path.split("?")[0]!.split("#")[0]!;
  const dot = clean.lastIndexOf(".");
  if (dot === -1 || dot === clean.length - 1) return "";
  return clean.slice(dot + 1).toLowerCase();
}

/** Label shown under each thumbnail in the admin media library. */
export function mediaFormatLabel(item: MediaFormatFields): string {
  const source = item.source_type ?? "storage";
  if (source === "external" || source === "embed") {
    switch (item.external_provider) {
      case "youtube":
        return "YouTube";
      case "vimeo":
        return "Vimeo";
      default:
        return "Link";
    }
  }
  const ext = extensionFromUrl(item.storage_path || item.public_url || "");
  if (ext) return ext.toUpperCase();
  if (item.kind === "video") return "Vídeo";
  if (item.kind === "image") return "Imagem";
  return item.kind.toUpperCase();
}