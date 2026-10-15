import { SocialBar, type SocialUrls } from "@/components/jula/SocialBar";
import { GlitchingTechEye } from "./GlitchingTechEye";
import { ImageGlitch } from "./ImageGlitch";

const BOOTH_PHOTO = "/brand/tulio-booth.jpg";

/** Section 1 — session photo on the left, booth photo on the right, small eye at the top right. */
export function TriangleGridSection({
  links,
  imageUrl = "/brand/tulio-session.jpg",
  imageAlt = "Tulio no set",
}: {
  links: SocialUrls;
  imageUrl?: string;
  imageAlt?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-black md:min-h-[calc(100dvh-8.4rem)]" aria-label="Abertura">
      <div className="relative z-10 grid min-h-[78vh] grid-cols-2 md:h-[calc(100dvh-8.4rem)]">
        <ImageGlitch src={imageUrl} alt={imageAlt} edge="left" />
        <ImageGlitch src={BOOTH_PHOTO} alt="Tulio na cabine" edge="right" />
      </div>
      <div className="pointer-events-none absolute top-3 right-3 z-20 size-[34vw] max-w-[220px] md:top-6 md:right-8 md:size-[240px]">
        <GlitchingTechEye logoSrc="/brand/tulio-mark.png" className="absolute inset-0 h-full w-full" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center px-6 md:bottom-8">
        <div className="pointer-events-auto w-full max-w-3xl">
          <SocialBar links={links} all />
        </div>
      </div>
    </section>
  );
}
