import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { LanguageSelector } from "@/components/jula/LanguageSelector";
import { UpcomingDatesDialog, openUpcomingDates } from "@/components/jula/UpcomingDates";
import { GlyphHover } from "@/components/tulio/GlyphHover";
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
    `whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.16em] no-underline transition-colors md:text-[12px] ${
      active ? "text-white" : "text-white/65 hover:text-white"
    }`;

  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const root = document.documentElement;
    const sync = () => root.style.setProperty("--site-header-h", `${header.offsetHeight}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--site-header-h");
    };
  }, []);

  return (
    <>
      <header ref={headerRef} className="nc-grid-border-b fixed inset-x-0 top-0 z-[70] bg-black text-white">
        <div className="flex justify-center px-4 pt-[max(env(safe-area-inset-top),1.25rem)] md:pt-[max(env(safe-area-inset-top),1.5rem)]">
          <Link to="/" aria-label="Tulio — início" className="inline-flex no-underline">
            <TulioWordmark className="text-[36px] md:text-[46px]" />
          </Link>
        </div>
        <nav
          aria-label="Menu"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2.5 px-4 pt-5 pb-3 md:flex-nowrap md:gap-x-5 md:overflow-x-auto md:pt-6"
        >
          {links.map(([to, label]) => (
            <Link key={to} to={to} aria-label={label} className={itemClass(isActive(pathname, to))}>
              <GlyphHover text={label} className="inline-block" />
            </Link>
          ))}
          <button
            type="button"
            onClick={() => openUpcomingDates()}
            className={`${itemClass(false)} bg-transparent p-0`}
          >
            <GlyphHover text={t("upcomingDates")} className="inline-block" />
          </button>
          <LanguageSelector />
        </nav>
      </header>
      <UpcomingDatesDialog />
    </>
  );
}
