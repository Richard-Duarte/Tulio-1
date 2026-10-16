import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { SocialBar } from "@/components/jula/SocialBar";
import { TulioWordmark } from "@/components/tulio/TulioWordmark";
import { useI18n } from "@/lib/i18n";
import { getTulioHome, tulioHomeDefaults } from "@/lib/public.functions";
import { rectsOverlap } from "@/lib/rects-overlap";

export function Footer() {
  const { t } = useI18n();
  const loadHome = useServerFn(getTulioHome);
  const [links, setLinks] = useState(tulioHomeDefaults);
  const year = new Date().getFullYear();
  const admRef = useRef<HTMLAnchorElement>(null);
  const [admHidden, setAdmHidden] = useState(false);

  useEffect(() => {
    let active = true;
    loadHome()
      .then((home) => {
        if (active) {
          setLinks({
            ...tulioHomeDefaults,
            ...home,
            soundcloud_url: home.soundcloud_url || tulioHomeDefaults.soundcloud_url,
            instagram_url: home.instagram_url || tulioHomeDefaults.instagram_url,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [loadHome]);

  useEffect(() => {
    const adm = admRef.current;
    if (!adm) return;

    let raf = 0;
    const sync = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const player = document.querySelector<HTMLElement>("[data-audio-player]");
        if (!player) {
          setAdmHidden(false);
          return;
        }
        setAdmHidden(rectsOverlap(adm.getBoundingClientRect(), player.getBoundingClientRect()));
      });
    };

    sync();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    ro?.observe(adm);
    const player = document.querySelector("[data-audio-player]");
    if (player) ro?.observe(player);
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      mo.disconnect();
    };
  }, []);

  return (
    <footer className="nc-grid-border-t bg-black px-5 md:px-10">
      {/* Same pad above the logo and below the copyright */}
      <div className="relative pt-8 pb-8 md:pt-10 md:pb-10">
        <Link to="/" aria-label="Tulio" className="mx-auto block w-fit text-white">
          <TulioWordmark className="text-[clamp(0.96rem,2.4vw,1.7rem)]" />
        </Link>
        <div className="mx-auto mt-6 max-w-3xl md:mt-8">
          <SocialBar links={links} all footer showEmail={false} />
        </div>
        <p className="mx-auto mt-6 max-w-md text-center font-mono text-[9px] leading-relaxed tracking-[0.04em] text-white/40 md:mt-8">
          Copyright Tulio Music - {year}. {t("rightsReserved")}
        </p>
        <Link
          ref={admRef}
          to="/auth"
          aria-hidden={admHidden}
          tabIndex={admHidden ? -1 : undefined}
          className={`absolute right-0 bottom-8 font-mono text-[10px] uppercase tracking-[0.22em] text-white/30 transition-opacity hover:text-white/70 md:bottom-10 ${
            admHidden ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          ADM
        </Link>
      </div>
    </footer>
  );
}
