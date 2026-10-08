import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { TulioWordmark } from "@/components/tulio/TulioWordmark";

export function ScrollLogo() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const home = pathname === "/";
      const mobile = window.innerWidth < 768;
      const distance = window.innerHeight * (mobile ? 0.32 : 0.82);
      const progress = home ? Math.min(1, window.scrollY / distance) : 1;
      const startWidth = Math.min(window.innerWidth * 0.76, 640);
      const endWidth = 112;
      const width = startWidth + (endWidth - startWidth) * progress;
      const startX = (window.innerWidth - startWidth) / 2;
      const startY = (window.innerHeight * 0.94 - startWidth * 0.24) / 2;
      const endX = mobile ? 20 : 40;
      // vertically center the logo within the header bar so it aligns with the nav
      const bar = document.querySelector("header > div");
      const barH = bar ? bar.getBoundingClientRect().height : 49;
      const barTop = bar ? bar.getBoundingClientRect().top : 20;
      const logoH = endWidth * 0.22;
      const endY = barTop + (barH - logoH) / 2;
      element.style.width = `${width}px`;
      element.style.fontSize = `${width * 0.16}px`;
      element.style.opacity = home ? String(Math.min(1, Math.max(0, (progress - 0.08) / 0.35))) : "1";
      element.style.transform = `translate3d(${startX + (endX - startX) * progress}px, ${startY + (endY - startY) * progress}px, 0)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, [pathname]);

  return (
    <Link
      ref={ref}
      to="/"
      aria-label="Tulio — início"
      className="fixed left-0 top-0 z-[60] block w-[min(76vw,640px)] opacity-0 will-change-transform"
    >
      <TulioWordmark className="text-[1em] text-foreground" />
    </Link>
  );
}
