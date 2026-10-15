import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { SocialBar } from "@/components/jula/SocialBar";
import { TulioWordmark } from "@/components/tulio/TulioWordmark";
import { useI18n } from "@/lib/i18n";
import { getTulioHome, tulioHomeDefaults } from "@/lib/public.functions";

export function Footer() {
  const { t } = useI18n();
  const loadHome = useServerFn(getTulioHome);
  const [links, setLinks] = useState(tulioHomeDefaults);
  const year = new Date().getFullYear();

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

  return (
    <footer className="border-t border-[var(--nc-border)] bg-black px-5 pt-3 pb-4 md:-mt-24 md:px-10 md:pt-4 md:pb-5">
      <Link to="/" aria-label="Tulio" className="mx-auto block w-fit text-white">
        <TulioWordmark className="text-[clamp(0.96rem,2.4vw,1.7rem)]" />
      </Link>
      <div className="mx-auto mt-3 max-w-3xl md:mt-4">
        <SocialBar links={links} all footer showEmail={false} />
      </div>
      <p className="mx-auto mt-3 max-w-md text-center font-mono text-[9px] leading-relaxed tracking-[0.04em] text-white/40 md:mt-4">
        Copyright Tulio Music - {year}. {t("rightsReserved")}
      </p>
      <div className="mt-2 flex justify-end">
        <Link
          to="/auth"
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/30 transition-colors hover:text-white/70"
        >
          ADM
        </Link>
      </div>
    </footer>
  );
}
