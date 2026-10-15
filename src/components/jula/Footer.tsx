import { Link } from "@tanstack/react-router";
import { TulioWordmark } from "@/components/tulio/TulioWordmark";

export function Footer() {
  return (
    <footer className="bg-black py-14 md:py-16">
      <div className="px-5 md:px-10 lg:px-14">
        <div className="flex items-center justify-between gap-6">
          <Link to="/" className="inline-block shrink-0 text-white transition-opacity hover:opacity-75">
            <TulioWordmark className="text-[clamp(3.25rem,7vw,6rem)]" />
          </Link>
          <p className="max-w-[11rem] text-right font-mono text-[12px] leading-snug tracking-[0.08em] text-white md:max-w-none md:text-[15px]">
            All rights reserved Tulio {new Date().getFullYear()}
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
