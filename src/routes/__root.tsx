import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/jula/SiteHeader";
import { AudioPlayer } from "@/components/jula/AudioPlayer";
import { Footer } from "@/components/jula/Footer";
import { LoadingExperience } from "@/components/jula/LoadingExperience";
import { PageCurtain } from "@/components/jula/PageCurtain";
import { supabase } from "@/integrations/supabase/client";
import { I18nProvider, useI18n } from "@/lib/i18n";
import {
  completeIntro,
  getIntroState,
  introBootScript,
  introCriticalCss,
  introNoScriptCss,
  markIntroBooted,
} from "@/lib/intro";
import { useDampedScroll } from "@/lib/damped-scroll";
import { usePageTransitions } from "@/lib/page-transition";
import { useIdleRoutePrefetch } from "@/lib/prefetch";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  const {t}=useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("pageNotFound")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("pageNotFoundText")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const {t}=useI18n();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("loadError")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("loadErrorText")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("tryAgain")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TULIO" },
      { name: "description", content: "Site oficial de Tulio." },
      { name: "author", content: "Tulio" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Funnel+Display:wght@400;500;600&family=Fragment+Mono:ital@0;1&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "64x64" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    // The intro boot script sets <html data-intro> before hydration.
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: introCriticalCss }} />
        <script dangerouslySetInnerHTML={{ __html: introBootScript }} />
        <noscript dangerouslySetInnerHTML={{ __html: introNoScriptCss }} />
        <HeadContent />
      </head>
      <body>
        <I18nProvider>{children}</I18nProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const privateArea = pathname === "/auth" || pathname.startsWith("/admin");
  const router = useRouter();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient, router]);
  useEffect(() => {
    markIntroBooted();
    if (privateArea || getIntroState() === "skip") completeIntro();
    // Boot-time only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  usePageTransitions();
  useIdleRoutePrefetch();
  useDampedScroll();

  return (
    <QueryClientProvider client={queryClient}>
      {!privateArea && <LoadingExperience />}
      {!privateArea && <SiteHeader />}
      <LocalizedOutlet />
      {!privateArea && <Footer />}
      {!privateArea && <AudioPlayer />}
      <PageCurtain />
      <Toaster theme="dark" />
    </QueryClientProvider>
  );
}

/** Remount route content when locale changes so all copy picks up the new language. */
function LocalizedOutlet() {
  const { locale } = useI18n();
  return (
    <div className="page-enter pb-28 md:pb-32" key={locale}>
      <Outlet />
    </div>
  );
}
