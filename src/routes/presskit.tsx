import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, LoaderCircle, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { MediaGrid } from "@/components/jula/MediaGrid";
import { PageIntro } from "@/components/jula/PageIntro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPresskitContent, unlockPresskit, type PresskitContent } from "@/lib/presskit.functions";
import { getSiteSettings } from "@/lib/public.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/presskit")({
  // Protected content (media URLs, rider) comes only from getPresskitContent,
  // which verifies the signed session cookie server-side. While locked (incl.
  // link preloads) it returns `{ unlocked: false }` and nothing else.
  loader: async () => {
    const [settings, content] = await Promise.all([getSiteSettings(), getPresskitContent()]);
    return { settings, content };
  },
  head: () => ({
    meta: [
      { title: "Presskit — TULIO" },
      { name: "description", content: "Presskit oficial de Tulio para contratantes e imprensa." },
      { property: "og:title", content: "Presskit — TULIO" },
      {
        property: "og:description",
        content: "Materiais oficiais, release e rider técnico de Tulio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Presskit,
  errorComponent: PresskitError,
  notFoundComponent: () => null,
});

function PresskitError() {
  const { t } = useI18n();
  return <main className="grid min-h-screen place-items-center">{t("unavailable")}</main>;
}

type UnlockedContent = Extract<PresskitContent, { unlocked: true }>;

const PLACEHOLDER_ASPECTS = ["aspect-[3/2]", "aspect-[4/5]", "aspect-[3/2]", "aspect-[2/3]"];

function GridPlaceholder({ label }: { label?: string | undefined }) {
  return (
    <div aria-busy="true">
      {label && (
        <p
          className="mb-6 flex items-center gap-2 px-5 font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground md:px-10"
          role="status"
        >
          <LoaderCircle className="size-4 animate-spin text-primary" />
          {label}
        </p>
      )}
      <div
        className="columns-1 gap-3 px-3 sm:columns-2 md:columns-3 lg:columns-4"
        aria-hidden="true"
      >
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className={`mb-3 animate-pulse bg-card ${PLACEHOLDER_ASPECTS[i % PLACEHOLDER_ASPECTS.length]}`}
          />
        ))}
      </div>
    </div>
  );
}

function Presskit() {
  const { t } = useI18n();
  const data = Route.useLoaderData();
  const router = useRouter();
  const unlock = useServerFn(unlockPresskit);
  const loadContent = useServerFn(getPresskitContent);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  // Modal visibility must update immediately on success. Relying only on
  // loader data after router.invalidate() can leave the overlay open when the
  // session cookie is not reflected in the revalidated loader yet.
  const [unlocked, setUnlocked] = useState(data.content.unlocked);
  if (data.content.unlocked && !unlocked) setUnlocked(true);
  // Protected content fetched right after unlocking, so the grid can load
  // without waiting on (or depending on) the loader revalidation.
  const [fetched, setFetched] = useState<UnlockedContent | null>(null);
  const [contentError, setContentError] = useState(false);
  const content = data.content.unlocked ? data.content : fetched;

  async function fetchContent() {
    setContentError(false);
    try {
      const result = await loadContent();
      if (result.unlocked) setFetched(result);
      else setContentError(true);
    } catch {
      setContentError(true);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const result = await unlock({ data: { password } });
      if (result.ok) {
        setUnlocked(true);
        setPassword("");
        // Refresh router caches too (e.g. a locked preload) so revisits stay unlocked.
        await Promise.all([fetchContent(), router.invalidate()]);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={unlocked ? "" : "h-screen overflow-hidden"}>
      <PageIntro
        eyebrow={t("presskitEyebrow")}
        title={t("presskit")}
        description={t("presskitDescription")}
      />
      <div className="px-5 md:px-10">
        <section className="grid gap-12 border-y border-border py-16 md:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">Release</p>
            <div className="mt-6 space-y-5 text-base leading-7 text-muted-foreground">
              {data.settings.release_body.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="font-mono text-xl uppercase tracking-[.16em] text-primary md:text-2xl">
              {t("technicalRider")}
            </p>
            {content ? (
              <ol className="mt-6 space-y-4 text-sm uppercase leading-6 md:text-base">
                {content.rider.map((options, i) => (
                  <li key={i}>
                    <span className="mr-4 font-mono text-xs text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {options.join(` ${t("or")} `)}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-6 space-y-6" aria-hidden="true">
                <div className="h-8 w-4/5 animate-pulse bg-card" />
                <div className="h-8 w-3/5 animate-pulse bg-card" />
              </div>
            )}
          </div>
        </section>
      </div>
      <section className="py-20">
        <div className="mb-8 px-5 md:px-10">
          <h2 className="text-4xl uppercase">{t("photosVideos")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            <Download className="mr-2 inline size-4" />
            {t("highQualityHint")}
          </p>
        </div>
        {content ? (
          <MediaGrid items={content.media} downloads />
        ) : contentError ? (
          <div className="mx-5 border border-border bg-card p-7 md:mx-10">
            <p className="text-sm text-muted-foreground">{t("materialsError")}</p>
            <Button className="mt-4" variant="outline" onClick={() => void fetchContent()}>
              {t("tryAgain")}
            </Button>
          </div>
        ) : (
          <GridPlaceholder label={unlocked ? t("loadingMaterials") : undefined} />
        )}
      </section>
      {!unlocked && (
        // Below the header (z-50), logo and player so visitors can still navigate away.
        <div className="fixed inset-0 z-40 grid place-items-center bg-background/75 p-5 backdrop-blur-xl">
          <form onSubmit={submit} className="w-full max-w-sm border border-border bg-card p-7">
            <LockKeyhole className="text-primary" />
            <h2 className="mt-8 text-3xl uppercase">{t("presskitAccess")}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("passwordPrompt")}</p>
            <Input
              className="mt-7 h-11"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              aria-label={t("presskitPassword")}
            />
            {error && <p className="mt-3 text-sm text-destructive">{t("wrongPassword")}</p>}
            <Button className="mt-4 w-full" type="submit" disabled={loading}>
              {loading ? t("checking") : t("access")}
            </Button>
          </form>
        </div>
      )}
    </main>
  );
}
