import type { ReactNode } from "react";
import { SpacedHeading } from "@/components/nocturna/SpacedHeading";
import { Reveal } from "@/components/nocturna/NocturnaMotion";
import { NocturnaHeroVisual } from "@/components/nocturna/NocturnaVisual";
import { NocturnaBadge } from "@/components/nocturna/NocturnaShell";
import { HERO_ROLE_LINE } from "@/lib/hero-copy";

export function NocturnaHero({
  badges,
  title,
  description,
  paragraphs,
  actions,
  imageUrl,
}: {
  badges?: string[];
  title?: string;
  description?: string;
  paragraphs?: string[];
  actions?: ReactNode;
  imageUrl?: string | null;
}) {
  return (
    // Last block on the home: the footer's top line closes it.
    <section className="nc-hero">
      <div className="nc-grid-hero">
        <div className="nc-hero-copy nc-grid-border-r nc-pad-x nc-pad-y flex flex-col justify-between max-md:text-center">
          <Reveal>
            {badges?.length ? (
              <div className="mb-10 flex flex-wrap gap-2 max-md:justify-center">
                {badges.map((b) => (
                  <NocturnaBadge key={b}>{b}</NocturnaBadge>
                ))}
              </div>
            ) : null}
            {title ? (
              <SpacedHeading as="h1" className="max-w-xl text-[clamp(2.1rem,5vw,3.65rem)] max-md:mx-auto">
                {title}
              </SpacedHeading>
            ) : null}
            {paragraphs?.length ? (
              <div className={`max-w-xl space-y-5 max-md:mx-auto${title ? " mt-6" : ""}`}>
                {paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)} className="text-sm leading-7 text-white/82 md:text-[15px]">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : description ? (
              <p className="nc-lead mt-6 max-w-md max-md:mx-auto">{description}</p>
            ) : null}
            {actions ? (
              <div className="mt-9 flex flex-wrap items-center gap-4 max-md:justify-center">{actions}</div>
            ) : null}
          </Reveal>
          <p className="nc-muted mt-12 hidden font-mono text-[10px] uppercase tracking-[0.22em] md:block">
            {HERO_ROLE_LINE}
          </p>
        </div>
        {/* Mobile: photo sits above the bio block */}
        <Reveal delay={0.08} className="nc-grid-border-r grid min-h-[42vh] max-md:order-first md:min-h-0">
          <NocturnaHeroVisual imageUrl={imageUrl} />
        </Reveal>
      </div>
    </section>
  );
}
