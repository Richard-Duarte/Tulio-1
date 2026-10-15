import { createFileRoute } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { CornerButton } from "@/components/nocturna/CornerButton";
import { NocturnaSectionHeader, NocturnaStepsGrid } from "@/components/nocturna/NocturnaBlocks";
import { TriangleGridSection } from "@/components/nocturna/TriangleGridSection";
import { NocturnaHero } from "@/components/nocturna/NocturnaHero";
import { SectionWipe } from "@/components/nocturna/SectionTransition";
import { NocturnaSection } from "@/components/nocturna/NocturnaShell";
import { getHomepageMedia, getSiteSettings, getTulioHome, tulioHeroBody, tulioHomeDefaults } from "@/lib/public.functions";
import { getNocturnaHomeCopy } from "@/lib/nocturna-home";
import { useI18n } from "@/lib/i18n";
import { signalIntroReady } from "@/lib/intro";

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
      instagram_url: "https://www.instagram.com/tulio.music/",
      soundcloud_url: "https://soundcloud.com/tuliomusic",
      spotify_url: null,
      youtube_url: null,
      bandcamp_url: null,
      booking_email: "soniccdrivebookings@gmail.com",
    };
    const [settingsResult, mediaResult, homeResult] = await Promise.allSettled([
      getSiteSettings(),
      getHomepageMedia(),
      getTulioHome(),
    ]);
    return {
      settings: settingsResult.status === "fulfilled" ? settingsResult.value : fallbackSettings,
      media: mediaResult.status === "fulfilled" ? mediaResult.value : [],
      home: homeResult.status === "fulfilled" ? homeResult.value : tulioHomeDefaults,
    };
  },
  head: () => ({
    meta: [
      { title: "TULIO" },
      {
        name: "description",
        content: "Tulio — DJ. Techno, glitch e dark. Sets, lançamentos, galeria e presskit.",
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
        <h1 className="nc-display text-5xl">TULIO</h1>
        <p className="nc-muted mt-4">{t("preparing")}</p>
      </div>
    </main>
  );
}

function Home() {
  const { locale } = useI18n();
  const nc = getNocturnaHomeCopy(locale);
  const { settings, media, home } = Route.useLoaderData();
  const photos = media.filter((item) => item.kind === "image");
  const carousel = photos.slice(0, 14);
  const carouselUrls = carousel.map((item) => item.public_url ?? "").join("\n");

  useLayoutEffect(() => {
    signalIntroReady("scene");
  }, []);
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
    <main className="nc-page bg-black">
      <TriangleGridSection
        links={home}
        imageUrl={home.section1_image_url}
        rightImageUrl={home.section1_right_image_url}
        imageAlt={home.section1_image_alt}
      />

      <NocturnaSection alt className="nc-section-alt">
        <NocturnaSectionHeader
          eyebrow={nc.stepsEyebrow}
          title={nc.stepsTitle}
          className="px-5 pt-12 pb-6 md:px-10 md:pt-16 md:pb-8 lg:px-14"
        />
        {carousel.length > 1 && (
          <div className="overflow-hidden border-y border-[var(--nc-border)] py-6">
            <div className="marquee-track flex w-max gap-0">
              {[...carousel, ...carousel].map((item, i) => (
                <img
                  key={`${item.id}-${i}`}
                  src={item.public_url ?? ""}
                  alt={item.alt_text}
                  className="nc-dither-img h-44 w-auto border-r border-[var(--nc-border)] object-cover md:h-52"
                  loading={i < carousel.length ? "eager" : "lazy"}
                  decoding="async"
                />
              ))}
            </div>
          </div>
        )}
        <NocturnaStepsGrid
          steps={[
            { n: nc.step1n, title: nc.step1t, body: nc.step1b },
            { n: nc.step2n, title: nc.step2t, body: nc.step2b },
            { n: nc.step3n, title: nc.step3t, body: nc.step3b },
          ]}
        />
      </NocturnaSection>

      <NocturnaHero
        paragraphs={(home.hero_body && (locale === "pt" || home.hero_body.trim() !== tulioHeroBody)
          ? home.hero_body.split(/\n\n+/).map((paragraph) => paragraph.trim()).filter(Boolean)
          : [...nc.heroParagraphs])}
        imageUrl={home.hero_image_url || "/brand/tulio-n26.jpg"}
        actions={
          <>
            <CornerButton to="/sets" variant="primary">
              {nc.ctaPrimary}
            </CornerButton>
            <CornerButton to="/galeria">{nc.ctaSecondary}</CornerButton>
          </>
        }
      />

      <SectionWipe />


      {home.booking_email && (
        <div className="flex h-28 items-center justify-center bg-black px-6 text-center max-md:-mb-28 md:hidden">
          <a
            href={`mailto:${home.booking_email}`}
            className="break-all font-mono text-[11px] uppercase leading-snug tracking-[0.16em] text-white/75"
          >
            Bookings · {home.booking_email}
          </a>
        </div>
      )}

    </main>
  );
}
