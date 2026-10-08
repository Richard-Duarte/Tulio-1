import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageIntro } from "@/components/jula/PageIntro";
import { SwapText } from "@/components/jula/SwapText";
import { SetsPlayer } from "@/components/sets/SetsPlayer";
import { SetsPlayerProvider, useSetsPlayer } from "@/components/sets/SetsPlayerProvider";
import { UndergroundScene } from "@/components/sets/UndergroundScene";
import { useStoreSelector, type PlayerTrack } from "@/components/sets/player-store";
import { getPublicMusic, getSiteSettings } from "@/lib/public.functions";
import { formatSetDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/sets")({
  loader: async () => {
    const [music, settings] = await Promise.all([getPublicMusic(), getSiteSettings()]);
    return { ...music, sets_shuffle: settings.sets_shuffle ?? false };
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
  const { sets, sets_shuffle: setsShuffle } = Route.useLoaderData();
  const tracks = useMemo<PlayerTrack[]>(
    () =>
      sets
        .filter((set) => set.soundcloud_url)
        .map((set) => ({
          id: set.id,
          title: set.title,
          url: set.soundcloud_url as string,
          cover: set.cover_url,
          date: formatSetDate(set.played_at),
          durationMs: (set.duration_seconds ?? 0) * 1000,
        })),
    [sets],
  );
  return (
    <SetsPlayerProvider tracks={tracks} shuffle={setsShuffle}>
      <UndergroundScene />
      <SetsStage empty={tracks.length === 0} />
      <SetsPlayer />
    </SetsPlayerProvider>
  );
}

function SetsStage({ empty }: { empty: boolean }) {
  const { t } = useI18n();
  const { store } = useSetsPlayer();
  // Minimized player = "just the scene": the heading fades out (kept in the DOM / a11y tree,
  // and click-through so it never blocks camera drags) and comes back when the player expands.
  const sceneOnly = useStoreSelector(store, (s) => s.minimized && s.tracks.length > 0);
  return (
    // Fills the first screen so the 3D scene is the backdrop for the player. pointer-events: the
    // page is see-through for drags (they reach the 3D background's camera controls); only the
    // text and links stay interactive.
    <main
      className="pointer-events-none relative flex min-h-[100svh] flex-col pb-28 md:pb-8 [&_:is(h1,p,li,summary,a,button)]:pointer-events-auto [&_:is(h1,p)]:w-fit"
      data-scene-passthrough=""
    >
      {/* PageIntro's markup, tighter on phones so the expanded player doesn't cover the title */}
      <section
        className={`px-5 pb-10 pt-24 transition-[opacity,transform] duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none md:px-10 md:pb-16 md:pt-48 ${sceneOnly ? "-translate-y-2 opacity-0 [&_*]:!pointer-events-none" : ""}`}
      >
        <p className="font-mono text-[10px] uppercase tracking-[.22em] text-primary">
          {t("setsEyebrow")}
        </p>
        <h1 className="mt-4 max-w-5xl text-5xl font-semibold uppercase leading-[.9] md:mt-5 md:text-8xl">
          <SwapText>{t("sets")}</SwapText>
        </h1>
        <p
          className={`mt-7 max-w-xl text-base leading-7 text-muted-foreground ${empty ? "" : "max-md:hidden"}`}
        >
          {empty ? t("setsSoon") : t("setsDescription")}
        </p>
      </section>
    </main>
  );
}
