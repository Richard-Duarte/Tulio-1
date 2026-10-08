import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/jula/LanguageSelector";
import { SwapText } from "@/components/jula/SwapText";
import { UpcomingDatesDialog, UpcomingDatesNavItem } from "@/components/jula/UpcomingDates";
import { useI18n } from "@/lib/i18n";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const isHome = useRouterState({ select: (s) => s.location.pathname === "/" });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const headerRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Scroll-linked slide. `--nav-p` goes 0 -> 1 linearly while the home hero scrolls out from under
  // the bar (0 = items centered / mobile icon centered, 1 = flush right). Transforms are pure CSS
  // percentages driven by that one variable (see `slide` below), so nothing is measured per frame,
  // React never re-renders on scroll, and the travel distance adapts by itself to label length,
  // language, fonts and extra nav items. Inner pages are always docked (p = 1); the inline default
  // below matches on server and client, so hydration is safe.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const targets = [header, overlayRef.current].filter(Boolean) as HTMLElement[];
    const set = (name: string, value: string) =>
      targets.forEach((el) => el.style.setProperty(name, value));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Route switches (home <-> inner page) happen behind the transition curtain
    // (lib/page-transition.ts), so the bar simply snaps to its new layout there.
    if (!isHome) {
      set("--nav-p", "1");
      return;
    }

    // Scroll distance over which the slide happens: until the hero's bottom edge reaches the
    // bar's bottom edge (i.e. section 2 arrives under the menu). Layout offsets (not rects) so a
    // running `.page-enter` reveal can't skew it; re-measured on resize / hero or bar size changes.
    let range = 1;
    const measure = () => {
      const hero = document.querySelector<HTMLElement>("main > section");
      let heroBottom = window.innerHeight * 0.94;
      if (hero) {
        let top = 0;
        for (let el: HTMLElement | null = hero; el; el = el.offsetParent as HTMLElement | null)
          top += el.offsetTop;
        heroBottom = top + hero.offsetHeight;
      }
      range = Math.max(1, heroBottom - header.getBoundingClientRect().bottom);
    };
    let raf = 0;
    const update = () => {
      raf = 0;
      let p = Math.min(1, Math.max(0, window.scrollY / range));
      if (reduce.matches) p = p >= 0.5 ? 1 : 0;
      set("--nav-p", p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    update();
    const ro = new ResizeObserver(onResize);
    const hero = document.querySelector("main > section");
    if (hero) ro.observe(hero);
    ro.observe(header);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    reduce.addEventListener("change", onScroll);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      reduce.removeEventListener("change", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isHome]);

  // Two-layer centering: a full-width track moves -50% of the bar while the group inside moves
  // +50% of its own width, both scaled by (1 - p). p = 0 -> centered, p = 1 -> flush right.
  const initial = { "--nav-p": isHome ? 0 : 1, "--nav-t": "0s" } as CSSProperties;
  const slide =
    "[transition:transform_var(--nav-t,0s)_cubic-bezier(.33,1,.68,1)] will-change-transform";
  const track: CSSProperties = { transform: "translate3d(calc(-50% * (1 - var(--nav-p))), 0, 0)" };
  const group: CSSProperties = { transform: "translate3d(calc(50% * (1 - var(--nav-p))), 0, 0)" };

  const links = [
    ["/galeria", t("gallery")],
    ["/sets", t("sets")],
    ["/live-sets", t("liveSets")],
    ["/releases", t("releases")],
    ["/presskit", t("presskit")],
  ] as const;

  return (
    <>
      {/* Floating bar: detached from the viewport top/sides so content shows in the gap above.
          Content edges sit at 20px (mobile) / 40px (desktop), where ScrollLogo docks the logo. */}
      <header
        ref={headerRef}
        style={initial}
        className="fixed inset-x-3 top-[max(env(safe-area-inset-top),0.75rem)] z-50 rounded-xl border border-border/50 bg-background/40 px-2 py-1 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.65)] backdrop-blur-sm md:inset-x-5 md:top-4 md:px-5 md:py-2.5"
      >
        <div className="grid items-center">
          <div
            className="h-6 w-28 shrink-0 justify-self-start [grid-area:1/1]"
            aria-hidden="true"
          />
          <div
            className={`pointer-events-none hidden justify-end [grid-area:1/1] md:flex ${slide}`}
            style={track}
          >
            <div
              className={`pointer-events-auto flex items-center gap-4 lg:gap-6 xl:gap-7 ${slide}`}
              style={group}
            >
              <nav className="flex items-center gap-4 lg:gap-6 xl:gap-7">
                {links.map(([to, label]) => (
                  <Link
                    key={to}
                    to={to}
                    className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[.1em] text-muted-foreground transition-colors hover:text-foreground lg:tracking-[.14em] xl:tracking-[.18em]"
                    activeProps={{ className: "text-foreground" }}
                  >
                    <SwapText>{label}</SwapText>
                  </Link>
                ))}
                <UpcomingDatesNavItem variant="desktop" />
              </nav>
              <LanguageSelector />
            </div>
          </div>
          <div
            className={`pointer-events-none flex justify-end [grid-area:1/1] md:hidden ${slide}`}
            style={track}
          >
            <div className={`pointer-events-auto ${slide}`} style={group}>
              <Button
                variant="ghost"
                aria-label={open ? t("closeMenu") : t("openMenu")}
                onClick={() => setOpen((v) => !v)}
                className="size-11 shrink-0 text-foreground hover:bg-transparent hover:text-foreground focus-visible:bg-transparent"
              >
                {open ? <X className="size-6" /> : <Menu className="size-6" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile fullscreen menu overlay (sibling so it can sit above the fixed center logo) */}
      <div
        ref={overlayRef}
        style={initial}
        aria-hidden={!open}
        className={`md:hidden fixed inset-0 z-[65] flex flex-col justify-between px-6 pt-24 pb-10 transition-all duration-500 ease-[cubic-bezier(.76,0,.24,1)] ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        } bg-background/50 backdrop-blur-2xl`}
      >
        {/* gradient veils so the bar and the floating player read cleanly */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background/95 via-background/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent" />

        {/* close button: same track as the menu icon, so it opens exactly where the icon is */}
        <div
          className="pointer-events-none absolute inset-x-[21px] top-[calc(max(env(safe-area-inset-top),0.75rem)+5px)] flex justify-end"
          style={track}
        >
          <button
            type="button"
            aria-label={t("closeMenu")}
            onClick={() => setOpen(false)}
            className={`inline-flex size-11 items-center justify-center text-foreground hover:text-foreground ${open ? "pointer-events-auto" : "pointer-events-none"}`}
            tabIndex={open ? 0 : -1}
            style={group}
          >
            <X className="size-6" />
          </button>
        </div>

        <nav className="relative -mx-2 flex min-h-0 flex-col gap-1 overflow-y-auto overscroll-contain px-2">
          {links.map(([to, label], i) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className="group block py-3 font-display text-4xl font-black uppercase leading-none tracking-tight text-foreground/85 transition-all duration-500 hover:text-foreground"
              style={{
                transitionDelay: open ? `${120 + i * 80}ms` : "0ms",
                opacity: open ? 1 : 0,
                transform: open ? "translateY(0)" : "translateY(28px)",
              }}
            >
              <span className="block overflow-hidden">
                <span className="block transition-transform duration-500 group-hover:translate-y-[-105%]">
                  {label}
                </span>
              </span>
              <span className="block overflow-hidden">
                <span className="block translate-y-[105%] text-foreground transition-transform duration-500 group-hover:translate-y-0">
                  {label}
                </span>
              </span>
            </Link>
          ))}
          <UpcomingDatesNavItem
            variant="mobile"
            index={links.length}
            menuOpen={open}
            onSelect={() => setOpen(false)}
          />
        </nav>

        <div
          className="relative flex shrink-0 items-center justify-between border-t border-border/40 pt-5"
          style={{
            opacity: open ? 1 : 0,
            transform: open ? "translateY(0)" : "translateY(20px)",
            transition: `opacity .5s cubic-bezier(.76,0,.24,1)${open ? " .12s" : ""}, transform .5s cubic-bezier(.76,0,.24,1)${open ? " .12s" : ""}`,
          }}
        >
          <LanguageSelector mobile />
          <span className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">
            {t("location")}
          </span>
        </div>
      </div>

      <UpcomingDatesDialog />
    </>
  );
}
