import { SocialBar, type SocialUrls } from "@/components/jula/SocialBar";
import { GlitchingTechEye } from "./GlitchingTechEye";
import { ImageGlitch } from "./ImageGlitch";

const BOOTH_PHOTO = "/brand/tulio-booth.jpg";

/** Section 1 — session photo on the left, booth photo on the right, small eye centered at the top. */
export function TriangleGridSection({
  links,
  imageUrl = "/brand/tulio-session.jpg",
  imageAlt = "Tulio no set",
  rightImageUrl = BOOTH_PHOTO,
}: {
  links: SocialUrls;
  imageUrl?: string;
  imageAlt?: string;
  rightImageUrl?: string;
}) {
  const sessionSrc =
    imageUrl.includes("tulio-session.jpg") && !imageUrl.includes("v=")
      ? `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}v=3`
      : imageUrl;

  return (
    <section className="relative overflow-hidden bg-black md:min-h-[calc(100dvh-9.2rem)]" aria-label="Abertura">
      <div className="relative z-10 grid min-h-[78vh] grid-cols-2 md:h-[calc(100dvh-9.2rem)]">
        <ImageGlitch src={sessionSrc} alt={imageAlt} edge="left" />
        <ImageGlitch src={rightImageUrl || BOOTH_PHOTO} alt="Tulio na cabine" edge="right" />
      </div>
      <div className="pointer-events-none absolute top-0 left-1/2 z-20 size-[34vw] max-w-[220px] -translate-x-1/2 -translate-y-8 md:size-[240px]">
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
