import type { ReactNode } from "react";
import { SpacedHeading } from "@/components/nocturna/SpacedHeading";
import { Reveal } from "@/components/nocturna/NocturnaMotion";
import { NocturnaHeroVisual } from "@/components/nocturna/NocturnaVisual";
import { NocturnaBadge } from "@/components/nocturna/NocturnaShell";

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
    <section className="nc-hero nc-grid-border-b">
      <div className="nc-grid-hero">
        <div className="nc-grid-border-r flex flex-col justify-between px-5 py-10 md:px-10 md:py-14 lg:px-14 lg:py-16">
          <Reveal>
            {badges?.length ? (
              <div className="mb-10 flex flex-wrap gap-2">
                {badges.map((b) => (
                  <NocturnaBadge key={b}>{b}</NocturnaBadge>
                ))}
              </div>
            ) : null}
            {title ? (
              <SpacedHeading as="h1" className="max-w-xl text-[clamp(2.1rem,5vw,3.65rem)]">
                {title}
              </SpacedHeading>
            ) : null}
            {paragraphs?.length ? (
              <div className="max-w-xl space-y-5">
                {paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)} className="text-sm leading-7 text-white/82 md:text-[15px]">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : description ? (
              <p className="nc-lead mt-6 max-w-md">{description}</p>
            ) : null}
            {actions ? <div className="mt-9 flex flex-wrap items-center gap-4">{actions}</div> : null}
          </Reveal>
          <p className="nc-muted mt-12 hidden font-mono text-[10px] uppercase tracking-[0.22em] md:block">
            DJ · produtor · SP
          </p>
        </div>
        <Reveal delay={0.08} className="nc-grid-border-r min-h-[42vh] md:min-h-0">
          <NocturnaHeroVisual imageUrl={imageUrl} />
        </Reveal>
      </div>
    </section>
  );
}
