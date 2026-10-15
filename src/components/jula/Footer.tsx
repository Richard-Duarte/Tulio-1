import { Link } from "@tanstack/react-router";
import { TulioWordmark } from "@/components/tulio/TulioWordmark";

export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-white/10 bg-black py-14 md:py-16">
      <div className="relative z-10 px-5 md:px-10 lg:px-14">
        <Link to="/" className="inline-block text-white transition-opacity hover:opacity-75">
          <TulioWordmark className="text-[clamp(3.25rem,7vw,6rem)]" />
        </Link>
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="font-mono text-xs tracking-[0.18em] text-white/70">Tulio {new Date().getFullYear()}</p>
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
