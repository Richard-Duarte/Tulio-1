import { createFileRoute, Link } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { CharacterBackground } from "@/components/tulio/CharacterBackground";
import { LogoParticleField } from "@/components/tulio/LogoParticleField";
import { SocialBar } from "@/components/jula/SocialBar";
import { WordReveal } from "@/components/jula/WordReveal";
import { Button } from "@/components/ui/button";
import { getHomepageMedia, getReleaseSections, getSiteSettings } from "@/lib/public.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  loader: async () => {
    const fallbackSettings = {
      artist_name: "TULIO",
      release_title: "Release TULIO",
      release_body: "",
      logo_url: null,
      player_enabled: false,
      player_shuffle: false,
      sets_shuffle: false,
      instagram_url: null,
      soundcloud_url: null,
      spotify_url: null,
      youtube_url: null,
      bandcamp_url: null,
    };
    const [settingsResult, mediaResult, sectionsResult] = await Promise.allSettled([
      getSiteSettings(),
      getHomepageMedia(),
      getReleaseSections(),
    ]);
    return {
      settings: settingsResult.status === "fulfilled" ? settingsResult.value : fallbackSettings,
      media: mediaResult.status === "fulfilled" ? mediaResult.value : [],
      sections: sectionsResult.status === "fulfilled" ? sectionsResult.value : [],
    };
  },
  head: () => ({
    meta: [
      { title: "TULIO" },
      {
        name: "description",
        content:
          "Tulio — DJ. Techno, glitch e dark. Sets, lançamentos, galeria e presskit.",
      },
      { property: "og:title", content: "TULIO" },
      {
        property: "og:description",
        content: "Sets, lançamentos, galeria e presskit oficial de Tulio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
  errorComponent: HomeError,
  notFoundComponent: () => null,
});
function HomeError() {
  const { t } = useI18n();
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-5xl">TULIO</h1>
        <p className="mt-4 text-muted-foreground">{t("preparing")}</p>
      </div>
    </main>
  );
}
function Home() {
  const { t } = useI18n();
  const { settings, media, sections } = Route.useLoaderData();
  const blocks = sections.length
    ? sections
    : settings.release_body
        .split("\n\n")
        .map((body, i) => ({ id: String(i), body, image_url: null, sort_order: i }));
  const photos = media.filter((item) => item.kind === "image");
  const videos = media.filter((item) => item.kind === "video");
  const carousel = photos.slice(0, 14);
  const carouselUrls = carousel.map((item) => item.public_url ?? "").join("\n");
  useLayoutEffect(() => {
    for (const src of carouselUrls.split("\n")) {
      if (!src) continue;
      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = "high";
      image.src = src;
    }
  }, [carouselUrls]);
  return (
    <main>
      <section className="relative flex min-h-[94svh] items-center justify-center overflow-hidden bg-background">
        <CharacterBackground />
        <LogoParticleField />
        <div className="pointer-events-none relative z-10 flex flex-col items-center gap-4">
          <img
            src="/brand/tulio-logo.png"
            alt="Tulio"
            className="w-[min(72vw,520px)] max-w-full object-contain mix-blend-screen opacity-90"
          />
          <p className="font-mono text-[10px] uppercase tracking-[.38em] text-primary glitch-text">
            {settings.artist_name ?? "TULIO"} · {t("location")}
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-8 z-10 px-16">
          <SocialBar links={settings} />
        </div>
      </section>
      <section className="overflow-hidden border-y border-border py-6">
        <div className="marquee-track flex w-max gap-3">
          {[...carousel, ...carousel].map((item, i) => {
            const first = i < carousel.length;
            return (
              <img
                key={`${item.id}-${i}`}
                src={item.public_url ?? ""}
                alt={item.alt_text}
                className="h-[42vh] min-h-72 w-auto object-cover md:h-[58vh]"
                loading={first ? "eager" : "lazy"}
                fetchPriority={i < 6 ? "high" : "low"}
                decoding="async"
              />
            );
          })}
        </div>
      </section>
      <section className="grid gap-12 px-5 py-28 md:grid-cols-[.7fr_2fr] md:px-10 md:py-40">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">
            {t("biography")}
          </p>
          <h2 className="mt-4 text-3xl uppercase">{settings.release_title}</h2>
        </div>
        <div className="space-y-16 md:space-y-24">
          {blocks.map((block, i) => (
            <div
              key={block.id}
              className={`grid items-center gap-7 md:grid-cols-2 md:gap-12 ${i % 2 ? "md:[&>figure]:order-first" : ""}`}
            >
              <WordReveal>{block.body}</WordReveal>
              {block.image_url && (
                <figure className="overflow-hidden border border-border/60">
                  <img
                    src={block.image_url}
                    alt={settings.artist_name}
                    loading="lazy"
                    className="h-64 w-full object-cover transition-transform duration-[1.2s] ease-out hover:scale-[1.04] md:h-80"
                  />
                </figure>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="border-y border-border px-5 py-24 md:px-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">
              {t("visualArchive")}
            </p>
            <h2 className="mt-4 max-w-3xl text-5xl uppercase leading-[.92] md:text-8xl">
              {t("visualTitle")}
            </h2>
          </div>
          <Button asChild size="lg">
            <Link to="/galeria">
              {t("viewGallery")} <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
