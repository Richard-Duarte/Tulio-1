import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CheckSquare, Download, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PhotoLightbox } from "@/components/jula/PhotoLightbox";
import { GlyphHover } from "@/components/tulio/GlyphHover";
import { useI18n, type Locale } from "@/lib/i18n";
import { downloadMedia, downloadMediaZip, type ZipProgress } from "@/lib/media-download";
import { cn } from "@/lib/utils";

type MediaItem = {
  id: string;
  kind: "image" | "video" | "audio";
  title: string;
  public_url: string | null;
  poster_url: string | null;
  alt_text: string;
  downloadable: boolean;
  presskit_enabled: boolean;
  party_id?: string | null;
};
type Party = { id: string; name: string; happened_at: string | null };

const ZIP_NAME = "jula-presskit.zip";

const localeTags: Record<Locale, string> = {
  pt: "pt-BR",
  es: "es-ES",
  en: "en-US",
  fr: "fr-FR",
  de: "de-DE",
  nl: "nl-NL",
};
function VideoWall({ videos, downloads }: { videos: MediaItem[]; downloads: boolean }) {
  const { t } = useI18n();
  if (videos.length === 0) return null;
  return (
    <section id="galeria-videos">
      <header className="flex items-baseline justify-between border-b border-border/60 px-5 pb-3 md:px-10">
        <h2 className="text-2xl uppercase md:text-4xl">
          <GlyphHover text={t("videos")} />
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
          {String(videos.length).padStart(2, "0")}
        </p>
      </header>
      <div className="mt-5 grid gap-3 px-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {videos.map((v) => (
          <div key={v.id}>
            <video
              src={v.public_url ?? ""}
              poster={v.poster_url ?? undefined}
              controls
              playsInline
              preload="metadata"
              className="aspect-[9/16] w-full bg-card object-cover"
              aria-label={v.title}
            />
            {downloads && v.downloadable && (
              <Button asChild variant="outline" className="mt-2 w-full">
                <a href={v.public_url ?? ""} download>
                  {t("downloadVideo")}
                </a>
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(localeTags[locale], {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function MediaGrid({
  items,
  parties = [],
  allowVideos = true,
  downloads = false,
  phoneGrid = false,
}: {
  items: MediaItem[];
  parties?: Party[];
  allowVideos?: boolean;
  downloads?: boolean;
  /** Mobile gallery: iPhone-style tiles, two across, with a one-up option. */
  phoneGrid?: boolean;
}) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<"photos" | "videos">("photos");
  const [density, setDensity] = useState<1 | 2>(2);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [downloading, setDownloading] = useState<Set<string>>(() => new Set());
  const [zipProgress, setZipProgress] = useState<ZipProgress | null>(null);

  const photos = items.filter((x) => x.kind === "image" && x.public_url);
  const videos = items.filter((x) => x.kind === "video" && x.public_url);
  const groups = parties
    .map((party) => ({ party, photos: photos.filter((p) => p.party_id === party.id) }))
    .filter((group) => group.photos.length > 0);
  const loose = photos.filter((p) => !groups.some((g) => g.photos.includes(p)));
  if (loose.length > 0)
    groups.push({
      party: { id: "__other", name: t("otherPhotos"), happened_at: null },
      photos: loose,
    });

  // Only photos flagged as downloadable can be downloaded or selected.
  const downloadablePhotos = downloads ? photos.filter((p) => p.downloadable) : [];
  const canSelect = downloadablePhotos.length > 0;
  const pickedItems = downloadablePhotos.filter((p) => picked.has(p.id));
  const allPicked = canSelect && pickedItems.length === downloadablePhotos.length;
  const zipping = zipProgress !== null;

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setPicked(new Set());
  }, []);

  // Esc leaves selection mode (the lightbox handles its own Esc while open).
  useEffect(() => {
    if (!selectionMode || selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !zipping) exitSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectionMode, selected, zipping, exitSelection]);

  function togglePick(item: MediaItem) {
    setSelectionMode(true);
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  async function downloadOne(item: MediaItem) {
    if (downloading.has(item.id)) return;
    setDownloading((s) => new Set(s).add(item.id));
    try {
      await downloadMedia(item);
    } catch {
      toast.error(t("downloadError"));
    } finally {
      setDownloading((s) => {
        const next = new Set(s);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function downloadPicked() {
    if (pickedItems.length === 0 || zipping) return;
    if (pickedItems.length === 1) return downloadOne(pickedItems[0]!);
    setZipProgress({ done: 0, total: pickedItems.length });
    try {
      const { failed } = await downloadMediaZip(pickedItems, ZIP_NAME, setZipProgress);
      if (failed > 0) toast.warning(t("downloadPartial", { count: failed }));
    } catch {
      toast.error(t("downloadError"));
    } finally {
      setZipProgress(null);
    }
  }

  const iconButton =
    "absolute top-3 z-10 grid size-9 place-items-center rounded-full border border-border/70 bg-background/70 text-foreground shadow-lg backdrop-blur-md transition-[opacity,background-color,border-color] duration-300 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
  const triangleMark =
    "absolute top-3 left-3 z-10 grid size-10 place-items-center border-0 bg-background/80 text-foreground shadow-lg backdrop-blur-md [clip-path:polygon(50%_0,100%_100%,0_100%)] transition-[opacity,background-color] duration-300 focus-visible:opacity-100 focus-visible:outline-none";

  const tile = phoneGrid && density === 2;
  const photoCard = (item: MediaItem, index: number, party: Party) => {
    const selectable = downloads && item.downloadable;
    const isPicked = picked.has(item.id);
    const isDownloading = downloading.has(item.id);
    return (
      <div
        key={item.id}
        className={cn(
          "group relative overflow-hidden bg-black md:mb-3 md:break-inside-avoid md:bg-card",
          tile ? "max-md:aspect-square" : "mb-3 break-inside-avoid",
          phoneGrid && density === 1 && "max-md:mb-0 max-md:break-inside-auto",
        )}
        data-photo-id={item.id}
      >
        <button
          type="button"
          className={cn(
            "block w-full text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
            tile && "max-md:absolute max-md:inset-0",
          )}
          onClick={() => (selectionMode && selectable ? togglePick(item) : setSelected(item))}
          aria-label={selectionMode && selectable ? t("selectPhoto") : t("openPhoto")}
          aria-pressed={selectionMode && selectable ? isPicked : undefined}
        >
          <img
            src={item.public_url ?? ""}
            alt={item.alt_text}
            loading={index < 8 ? "eager" : "lazy"}
            className={cn(
              "w-full transition duration-700 group-hover:scale-[1.03] md:static md:h-auto",
              tile && "max-md:absolute max-md:inset-0 max-md:size-full max-md:object-cover",
              selectionMode && selectable && !isPicked && "opacity-70",
            )}
          />
          <span className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-background/90 via-background/10 to-transparent p-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            <span className="translate-y-3 font-mono text-[10px] uppercase tracking-[.18em] transition-transform duration-500 group-hover:translate-y-0">
              {party.id === "__other" ? item.title : party.name}
            </span>
            {party.happened_at && (
              <span className="mt-1 translate-y-3 font-mono text-[9px] uppercase tracking-[.16em] text-muted-foreground transition-transform duration-500 group-hover:translate-y-0">
                {formatDate(party.happened_at, locale)}
              </span>
            )}
          </span>
          {isPicked && (
            <span className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-primary" />
          )}
        </button>
        {selectable && (
          <button
            type="button"
            role="checkbox"
            aria-checked={isPicked}
            aria-label={t("selectPhoto")}
            onClick={(e) => {
              e.stopPropagation();
              togglePick(item);
            }}
            className={cn(
              triangleMark,
              isPicked && "bg-primary text-primary-foreground",
              // Desktop: reveal on hover. Touch: only shown in selection mode
              // (entered through the "Select" toggle).
              selectionMode || isPicked
                ? "opacity-100"
                : "opacity-0 pointer-coarse:hidden pointer-fine:group-hover:opacity-100",
            )}
          >
            <Check className={cn("mt-1.5 size-3.5", !isPicked && "opacity-40")} />
          </button>
        )}
        {selectable && !selectionMode && (
          <button
            type="button"
            aria-label={`${t("downloadPhoto")} — ${item.title}`}
            title={t("downloadPhoto")}
            disabled={isDownloading}
            onClick={(e) => {
              e.stopPropagation();
              void downloadOne(item);
            }}
            className={cn(
              iconButton,
              "right-3 hover:border-primary hover:bg-primary hover:text-primary-foreground",
              // Always visible on touch devices; on hover-capable pointers reveal on hover.
              isDownloading
                ? "opacity-100"
                : "opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100",
            )}
          >
            {isDownloading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
          </button>
        )}
      </div>
    );
  };

  const selectionCount =
    pickedItems.length === 0
      ? t("noneSelected")
      : pickedItems.length === 1
        ? t("selectedOne")
        : t("selectedMany", { count: pickedItems.length });

  return (
    <>
      <div className="mb-10 flex flex-wrap items-center gap-2 px-5 md:px-10">
        <Button variant={tab === "photos" ? "default" : "outline"} onClick={() => setTab("photos")}>
          {t("photos")}
        </Button>
        {allowVideos && (
          <Button
            variant={tab === "videos" ? "default" : "outline"}
            onClick={() => setTab("videos")}
          >
            {t("videos")}
          </Button>
        )}
        {phoneGrid && tab === "photos" && (
          <div className="ml-auto flex items-center gap-1 md:hidden" role="group" aria-label="Grade">
            <button
              type="button"
              aria-pressed={density === 1}
              aria-label="Uma foto"
              onClick={() => setDensity(1)}
              className={cn(
                "grid size-8 place-items-center border border-white/25",
                density === 1 ? "bg-white text-black" : "text-white/70",
              )}
            >
              <span className="block size-3.5 border border-current" />
            </button>
            <button
              type="button"
              aria-pressed={density === 2}
              aria-label="Duas fotos"
              onClick={() => setDensity(2)}
              className={cn(
                "grid size-8 place-items-center border border-white/25",
                density === 2 ? "bg-white text-black" : "text-white/70",
              )}
            >
              <span className="grid grid-cols-2 gap-0.5">
                <span className="size-1.5 bg-current" />
                <span className="size-1.5 bg-current" />
                <span className="size-1.5 bg-current" />
                <span className="size-1.5 bg-current" />
              </span>
            </button>
          </div>
        )}
        {tab === "photos" && canSelect && (
          <Button
            variant={selectionMode ? "default" : "outline"}
            className="ml-auto"
            aria-pressed={selectionMode}
            onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
          >
            {selectionMode ? <X /> : <CheckSquare />}
            {selectionMode ? t("cancel") : t("select")}
          </Button>
        )}
      </div>
      {tab === "photos" ? (
        <div className="space-y-16">
          {groups.map((group) => (
            <section key={group.party.id}>
              <header className="flex items-baseline justify-between border-b border-border/60 px-5 pb-3 md:px-10">
                <h2 className="text-2xl uppercase md:text-4xl">
                  <GlyphHover text={group.party.name} />
                </h2>
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
                  {group.party.happened_at
                    ? formatDate(group.party.happened_at, locale)
                    : String(group.photos.length).padStart(2, "0")}
                </p>
              </header>
              <div
                className={cn(
                  "mt-5 columns-1 gap-3 px-3 sm:columns-2 md:columns-3 lg:columns-4",
                  phoneGrid &&
                    "max-md:-mx-5 max-md:mt-0.5 max-md:grid max-md:columns-none max-md:gap-0.5 max-md:px-0",
                  phoneGrid && density === 2 && "max-md:grid-cols-2",
                  phoneGrid && density === 1 && "max-md:grid-cols-1",
                )}
              >
                {group.photos.map((item, i) => photoCard(item, i, group.party))}
              </div>
            </section>
          ))}
          {videos.length > 0 && <VideoWall videos={videos} downloads={downloads} />}
        </div>
      ) : (
        <VideoWall videos={videos} downloads={downloads} />
      )}
      {selected && (
        <PhotoLightbox
          photo={selected}
          onClose={() => setSelected(null)}
          onDownload={
            downloads && selected.downloadable ? () => void downloadOne(selected) : undefined
          }
          downloading={downloading.has(selected.id)}
        />
      )}
      {selectionMode &&
        tab === "photos" &&
        createPortal(
          <div
            className="fixed bottom-[max(env(safe-area-inset-bottom),1rem)] left-4 right-[5.5rem] z-[45] border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl md:left-1/2 md:right-auto md:w-[min(760px,calc(100vw-14rem))] md:-translate-x-1/2"
            role="toolbar"
            aria-label={t("select")}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p
                className="mr-auto font-mono text-[10px] uppercase tracking-[.18em] text-primary"
                aria-live="polite"
              >
                {selectionCount}
              </p>
              <Button
                variant="ghost"
                size="sm"
                disabled={zipping}
                onClick={() =>
                  setPicked(allPicked ? new Set() : new Set(downloadablePhotos.map((p) => p.id)))
                }
              >
                {allPicked ? t("clearSelection") : t("selectAll")}
              </Button>
              <Button
                size="sm"
                disabled={pickedItems.length === 0 || zipping}
                onClick={() => void downloadPicked()}
              >
                {zipping ? <LoaderCircle className="animate-spin" /> : <Download />}
                {zipping
                  ? t("preparingZip", { done: zipProgress.done, total: zipProgress.total })
                  : t("downloadSelected")}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={zipping}
                onClick={exitSelection}
                aria-label={t("cancel")}
              >
                <X />
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
