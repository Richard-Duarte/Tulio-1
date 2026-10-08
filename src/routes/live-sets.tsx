import { createFileRoute } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { useState } from "react";
import { PageIntro } from "@/components/jula/PageIntro";
import { VideoLightbox } from "@/components/jula/VideoLightbox";
import { getPublicLiveSets } from "@/lib/public.functions";
import { formatDuration, formatSetDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/live-sets")({
  // Object shape so the idle prefetch (src/lib/prefetch.ts) can warm the first covers.
  loader: async () => ({ liveSets: await getPublicLiveSets() }),
  head: () => ({
    meta: [
      { title: "Live Sets — TULIO" },
      { name: "description", content: "Assista aos live sets de Tulio gravados em vídeo." },
      { property: "og:title", content: "Live Sets — TULIO" },
      { property: "og:description", content: "Sets de Tulio gravados ao vivo em vídeo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveSets,
  errorComponent: () => <Empty />,
  notFoundComponent: () => null,
});

function Empty() {
  const { t } = useI18n();
  return (
    <main>
      <PageIntro
        eyebrow={t("liveSetsEyebrow")}
        title={t("liveSets")}
        description={t("liveSetsSoon")}
      />
    </main>
  );
}

type LiveSet = Awaited<ReturnType<typeof getPublicLiveSets>>[number];

function LiveSets() {
  const { t } = useI18n();
  const { liveSets: items } = Route.useLoaderData();
  const [open, setOpen] = useState<LiveSet | null>(null);
  return (
    <main>
      <PageIntro
        eyebrow={t("liveSetsEyebrow")}
        title={t("liveSets")}
        description={t("liveSetsDescription")}
      />
      {items.length === 0 ? (
        <div className="mx-5 border-y border-border py-16 font-mono text-xs uppercase tracking-[.18em] text-muted-foreground md:mx-10">
          {t("liveSetsSoon")}
        </div>
      ) : (
        <div className="grid overflow-hidden border-t border-border md:grid-cols-2 xl:grid-cols-3">
          {items.map((item, i) => {
            const meta = [
              formatSetDate(item.set_date),
              formatDuration(item.duration_seconds),
            ].filter(Boolean);
            const cover =
              item.cover_url ?? `https://i.ytimg.com/vi/${item.youtube_id}/hqdefault.jpg`;
            return (
              <article key={item.id} className="-mr-px border-b border-r border-border p-5 md:p-8">
                <button
                  type="button"
                  onClick={() => setOpen(item)}
                  aria-label={`${t("watchVideo")}: ${item.title}`}
                  className="group relative block aspect-video w-full overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <img
                    src={cover}
                    alt={`${t("coverOf")} ${item.title}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.03] motion-reduce:transition-none"
                  />
                  <span className="absolute inset-0 bg-background/10 transition-colors group-hover:bg-background/30" />
                  <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 bg-background/80 px-3 py-2 font-mono text-[10px] uppercase tracking-[.18em] text-foreground backdrop-blur">
                    <Play className="size-3.5 fill-current" /> {t("watch")}
                  </span>
                </button>
                <div className="mt-5 flex items-baseline gap-4">
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    {meta.length > 0 && (
                      <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">
                        {meta.join(" · ")}
                      </p>
                    )}
                    <h2 className="mt-2 break-words text-2xl uppercase">{item.title}</h2>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {open && <VideoLightbox video={open} onClose={() => setOpen(null)} />}
    </main>
  );
}
