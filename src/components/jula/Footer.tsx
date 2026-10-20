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
    <footer className="nc-grid-border-t bg-black px-5 md:px-10">
      {/* Same pad above the logo and below the copyright */}
      <div className="pt-8 pb-8 md:pt-10 md:pb-10">
        <Link to="/" aria-label="Tulio" className="mx-auto block w-fit text-white">
          <TulioWordmark className="text-[clamp(0.96rem,2.4vw,1.7rem)]" />
        </Link>
        <div className="mx-auto mt-6 max-w-3xl md:mt-8">
          <SocialBar links={links} all footer showEmail={false} />
        </div>
        <p className="mx-auto mt-6 max-w-md text-center font-mono text-[9px] leading-relaxed tracking-[0.04em] text-white/40 md:mt-8">
          Copyright{" "}
          {/* Hidden admin entry: reads as plain copyright text */}
          <Link to="/auth" className="text-inherit no-underline">
            Tulio
          </Link>{" "}
          Music - {year}. {t("rightsReserved")}
        </p>
      </div>
    </footer>
  );
}
