import { SpacedHeading } from "@/components/nocturna/SpacedHeading";
import { SectionWipe } from "@/components/nocturna/SectionTransition";
import { NocturnaEyebrow } from "@/components/nocturna/NocturnaShell";

export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <>
      <SectionWipe />
      <section className="nc-grid-border-b nc-pad-x nc-pad-y max-md:text-center">
        <div className="max-w-4xl max-md:mx-auto">
          <NocturnaEyebrow>{eyebrow}</NocturnaEyebrow>
          <SpacedHeading as="h1" className="mt-5 text-[clamp(2rem,5.5vw,3.65rem)]">
            {title}
          </SpacedHeading>
          <p className="nc-lead mt-6 max-w-2xl max-md:mx-auto">{description}</p>
        </div>
      </section>
    </>
  );
}
