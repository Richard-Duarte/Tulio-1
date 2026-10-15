import { Link, useRouterState } from "@tanstack/react-router";
import { LanguageSelector } from "@/components/jula/LanguageSelector";
import { UpcomingDatesDialog, openUpcomingDates } from "@/components/jula/UpcomingDates";
import { TulioWordmark } from "@/components/tulio/TulioWordmark";
import { useI18n } from "@/lib/i18n";

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function SiteHeader() {
  const { t, locale } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const homeLabel = { pt: "Início", es: "Inicio", en: "Home", fr: "Accueil", de: "Start", nl: "Home" }[locale];
  const links = [
    ["/", homeLabel],
    ["/galeria", t("gallery")],
    ["/sets", t("sets")],
    ["/live-sets", t("liveSets")],
    ["/releases", t("releases")],
    ["/presskit", t("presskit")],
  ] as const;

  const itemClass = (active: boolean) =>
    `whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.16em] transition-colors md:text-[12px] ${
      active ? "text-white" : "text-white/65 hover:text-white"
    }`;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[70] border-b border-white/10 bg-black/85 text-white backdrop-blur-md">
        <div className="flex justify-center px-4 pt-[max(env(safe-area-inset-top),0.7rem)] pb-2">
          <Link to="/" aria-label="Tulio — início" className="inline-flex no-underline">
            <TulioWordmark className="text-[36px] md:text-[46px]" />
          </Link>
        </div>
        <nav aria-label="Menu" className="flex items-center justify-center gap-x-5 overflow-x-auto px-4 pb-3">
          {links.map(([to, label]) => (
            <Link key={to} to={to} className={itemClass(isActive(pathname, to))}>
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => openUpcomingDates()}
            className={`${itemClass(false)} bg-transparent p-0`}
          >
            {t("upcomingDates")}
          </button>
          <LanguageSelector />
        </nav>
      </header>
      <UpcomingDatesDialog />
    </>
  );
}
