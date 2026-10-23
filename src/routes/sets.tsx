import { NocturnaEyebrow } from "@/components/nocturna/NocturnaShell";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageIntro } from "@/components/jula/PageIntro";
import { TitleMetal } from "@/components/tulio/TitleMetal";
import { useSetsPlayer } from "@/components/sets/SetsPlayerProvider";
import { setsToTracks } from "@/components/jula/AudioPlayer";
import { UndergroundScene } from "@/components/sets/UndergroundScene";
import { useStoreSelector } from "@/components/sets/player-store";
import { getPublicMusic, getSiteSettings } from "@/lib/public.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/sets")({
  loader: async () => {
    const [music, settings] = await Promise.all([getPublicMusic(), getSiteSettings()]);
    return {
      ...music,
      sets_shuffle: settings.sets_shuffle ?? false,
      sets_description: settings.sets_description ?? null,
    };
  },
  head: () => ({
    meta: [
      { title: "Sets — TULIO" },
      { name: "description", content: "Ouça os sets oficiais de Tulio." },
      { property: "og:title", content: "Sets — TULIO" },
      { property: "og:description", content: "Seleção de sets gravados por Tulio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Sets,
  errorComponent: () => <Empty />,
  notFoundComponent: () => null,
});

function Empty() {
  const { t } = useI18n();
  return (
    <main>
      <PageIntro eyebrow={t("setsEyebrow")} title={t("sets")} description={t("setsSoon")} />
    </main>
  );
}

/*
 * /sets = the 3D background + the floating player (its "Faixas dos sets" queue is the set list).
 * The page itself only carries the heading.
 */
function Sets() {
  const { sets } = Route.useLoaderData();
  const tracks = useMemo(() => setsToTracks(sets), [sets]);
  if (tracks.length === 0) {
    return (
      <>
        <UndergroundScene />
        <Empty />
      </>
    );
  }
  return (
    // the player itself is the global one (root layout): it keeps playing across pages
    <>
      <UndergroundScene />
      <SetsStage empty={false} />
    </>
  );
}

function SetsStage({ empty }: { empty: boolean }) {
  const { t } = useI18n();
  const { sets_description: setsDescription } = Route.useLoaderData();
  const { store } = useSetsPlayer();
  // Minimized player = "just the scene": the heading fades out (kept in the DOM / a11y tree,
  // and click-through so it never blocks camera drags) and comes back when the player expands.
  const sceneOnly = useStoreSelector(store, (s) => s.minimized && s.tracks.length > 0);
  return (
    // Fills the first screen so the 3D scene is the backdrop for the player. pointer-events: the
    // page is see-through for drags (they reach the 3D background's camera controls); only the
    // text and links stay interactive.
    <main
      className="pointer-events-none relative flex min-h-[100svh] flex-col pb-28 md:pb-8 [&_:is(h1,h2,h3,p,li,summary,a,button)]:pointer-events-auto [&_:is(h1,h2,h3,p)]:w-fit"
      data-scene-passthrough=""
    >
      {/* PageIntro's markup, tighter on phones so the expanded player doesn't cover the title */}
      <section
        className={`px-5 pb-10 pt-24 transition-[opacity,transform] duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none max-md:flex max-md:flex-col max-md:items-center max-md:text-center md:px-10 md:py-16 lg:px-14 ${sceneOnly ? "-translate-y-2 opacity-0 [&_*]:!pointer-events-none" : ""}`}
      >
        <NocturnaEyebrow>{t("setsEyebrow")}</NocturnaEyebrow>
        <TitleMetal className="mt-5 max-w-4xl text-[clamp(2rem,5.5vw,3.65rem)]">
          {t("sets")}
        </TitleMetal>
        <p className={`nc-lead mt-6 max-w-2xl ${empty ? "" : "max-md:hidden"}`}>
          {empty ? t("setsSoon") : setsDescription?.trim() || t("setsDescription")}
        </p>
      </section>
    </main>
  );
}
