import { Link } from "@tanstack/react-router";
import { FramerGridPreview } from "@/components/nocturna/FramerGridPreview";
import { TulioWordmark } from "@/components/tulio/TulioWordmark";

export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden nc-grid-border-t bg-black py-14 md:py-16">
      <FramerGridPreview className="pointer-events-none absolute inset-0 z-0" shape="triangle" controls={false} />
      <div className="relative z-10 px-5 md:px-10 lg:px-14">
        <div className="flex items-center justify-between gap-6">
          <Link to="/" className="inline-block text-white transition-opacity hover:opacity-75">
            <TulioWordmark className="text-[clamp(3.25rem,7vw,6rem)]" />
          </Link>
          <p className="font-mono text-[clamp(1.5rem,2.6vw,2.25rem)] tracking-[0.14em] text-white">
            {new Date().getFullYear()}
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          <Link
            to="/auth"
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45 transition-colors hover:text-white"
          >
            ADM
          </Link>
        </div>
      </div>
    </footer>
  );
}
