import { SocialBar, type SocialUrls } from "@/components/jula/SocialBar";
import { useMenuOpen } from "@/lib/menu-open";
import { FramerGridPreview } from "./FramerGridPreview";
import { GlitchingTechEye } from "./GlitchingTechEye";
import { ImageGlitch } from "./ImageGlitch";

/** Section 1 — triangle grid, eye on the left, glitch photo on the right. */
export function TriangleGridSection({ links }: { links: SocialUrls }) {
  const menuOpen = useMenuOpen();

  return (
    <section className="relative overflow-hidden bg-black md:min-h-[100dvh]" aria-label="Abertura">
      <FramerGridPreview className="pointer-events-none absolute inset-0" shape="triangle" controls={false} />
      <div className="relative z-10 grid grid-cols-1 md:h-[100dvh] md:grid-cols-2">
        <div className="relative h-[68vh] md:h-full">
          <GlitchingTechEye
            logoSrc="/brand/tulio-mark.png"
            logoBlur={menuOpen}
            className="absolute inset-0 h-full w-full"
          />
          <div
            className="absolute bottom-6 left-6 z-20 transition-opacity duration-500 md:bottom-8 md:left-8"
            style={{ opacity: menuOpen ? 0 : 1, pointerEvents: menuOpen ? "none" : "auto" }}
          >
            <SocialBar links={links} />
          </div>
        </div>
        <ImageGlitch src="/brand/tulio-session.jpg" alt="Tulio no set" />
      </div>
    </section>
  );
}
