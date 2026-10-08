import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { PageIntro } from "@/components/jula/PageIntro";
import { Button } from "@/components/ui/button";
import { getPublicMusic } from "@/lib/public.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/releases")({
  loader: () => getPublicMusic(),
  head: () => ({
    meta: [
      { title: "Releases — TULIO" },
      {
        name: "description",
        content: "Lançamentos oficiais de Tulio e links para plataformas digitais.",
      },
      { property: "og:title", content: "Releases — TULIO" },
      { property: "og:description", content: "Discografia e downloads oficiais de Tulio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Releases,
  errorComponent: () => <Empty />,
  notFoundComponent: () => null,
});

function Empty() {
  const { t } = useI18n();
  return (
    <main>
      <PageIntro
        eyebrow={t("releasesEyebrow")}
        title={t("releases")}
        description={t("releasesSoon")}
      />
    </main>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  const name = platform.toLowerCase();
  if (name.includes("spotify")) {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21Zm4.84 15.18a.66.66 0 0 1-.9.22c-2.47-1.51-5.58-1.85-9.24-1.01a.66.66 0 0 1-.3-1.28c4-.92 7.44-.52 10.22 1.17.31.19.4.6.22.9Zm1.28-2.85a.82.82 0 0 1-1.13.27c-2.83-1.74-7.14-2.24-10.48-1.23a.82.82 0 1 1-.48-1.57c3.82-1.16 8.57-.6 11.82 1.4.39.24.51.75.27 1.13Zm.11-2.97c-3.39-2.02-8.99-2.2-12.23-1.22a.98.98 0 0 1-.57-1.88c3.73-1.13 9.93-.91 13.85 1.4a.98.98 0 0 1-1.05 1.7Z"
        />
      </svg>
    );
  }
  if (name.includes("youtube")) {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
        <path
          fill="currentColor"
          d="M23 12.2s0-3.2-.4-4.6c-.2-.9-.9-1.6-1.8-1.8C19.2 5.4 12 5.4 12 5.4s-7.2 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 9 1 12.2 1 12.2s0 3.2.4 4.6c.2.9.9 1.6 1.8 1.8 1.6.4 8.8.4 8.8.4s7.2 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.6.4-4.6ZM9.8 15.5V8.9l6 3.3-6 3.3Z"
        />
      </svg>
    );
  }
  if (name.includes("bandcamp")) {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
        <path fill="currentColor" d="M2 17.5 8.2 6h13.8l-6.2 11.5H2Z" />
      </svg>
    );
  }
  return null;
}

function Releases() {
  const { t } = useI18n();
  const { releases, links } = Route.useLoaderData();
  return (
    <main>
      <PageIntro
        eyebrow={t("releasesEyebrow")}
        title={t("releases")}
        description={t("releasesDescription")}
      />
      {releases.length === 0 ? (
        <div className="mx-5 border-y border-border py-16 font-mono text-xs uppercase tracking-[.18em] text-muted-foreground md:mx-10">
          {t("releasesSoon")}
        </div>
      ) : (
        <div className="grid gap-px bg-border md:grid-cols-2">
          {releases.map((release) => (
            <article key={release.id} className="bg-background p-6 md:p-10">
              {release.cover_url && (
                <img
                  src={release.cover_url}
                  alt={`${t("coverOf")} ${release.title}`}
                  className="aspect-square w-full object-cover"
                />
              )}
              <h2 className="mt-6 text-4xl uppercase">{release.title}</h2>
              {release.released_at && (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">
                  {release.released_at}
                </p>
              )}
              {release.description && (
                <p className="mt-3 text-muted-foreground">{release.description}</p>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                {links
                  .filter((link) => link.release_id === release.id)
                  .map((link) => (
                    <Button
                      key={link.id}
                      asChild
                      variant="outline"
                      size="icon"
                      title={link.platform}
                    >
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={link.platform}
                      >
                        <PlatformIcon platform={link.platform} />
                      </a>
                    </Button>
                  ))}
                {release.download_enabled && release.download_url && (
                  <Button asChild>
                    <a href={release.download_url} download>
                      Download <Download />
                    </a>
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
