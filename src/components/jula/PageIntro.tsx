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
      <section className="nc-grid-border-b px-5 pb-14 pt-28 md:px-10 md:pb-20 md:pt-36 lg:px-14">
        <div className="max-w-4xl">
          <NocturnaEyebrow>{eyebrow}</NocturnaEyebrow>
          <SpacedHeading as="h1" className="mt-5 text-[clamp(2rem,5.5vw,3.65rem)]">
            {title}
          </SpacedHeading>
          <p className="nc-lead mt-6 max-w-2xl">{description}</p>
        </div>
      </section>
    </>
  );
}
