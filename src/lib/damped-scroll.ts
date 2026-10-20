import { useEffect } from "react";

/** Fraction of each wheel delta that reaches the page. */
const WHEEL_GAIN = 0.5;
/** Seconds for the scroll position to catch the wheel target. */
const EASE_SECONDS = 0.12;

/** Pure helper — kept testable so footer/layout regressions cannot hide under max scroll. */
export function pageScrollMax(scrollHeight: number, viewportHeight: number) {
  return Math.max(0, scrollHeight - viewportHeight);
}

function maxScroll() {
  return pageScrollMax(document.documentElement.scrollHeight, window.innerHeight);
}

function clampScroll(value: number) {
  return Math.min(maxScroll(), Math.max(0, value));
}

function scrollLocked() {
  const intro = document.documentElement.getAttribute("data-intro");
  if (intro === "active" || intro === "reveal") return true;
  const html = getComputedStyle(document.documentElement).overflowY;
  if (html === "hidden" || html === "clip") return true;
  const body = getComputedStyle(document.body).overflowY;
  if (body === "hidden" || body === "clip") return true;
  return false;
}

/** True when the event should stay on a nested scroller (modals, lists, lightboxes). */
function nestedScrollable(start: EventTarget | null, deltaY: number) {
  let node = start instanceof Element ? start : null;
  while (node && node !== document.body && node !== document.documentElement) {
    if (node instanceof HTMLElement) {
      if (node.hasAttribute("data-lenis-prevent")) return true;
      const overflowY = getComputedStyle(node).overflowY;
      const canScroll =
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
        node.scrollHeight > node.clientHeight + 2;
      if (canScroll) {
        const atTop = node.scrollTop <= 0;
        const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
        if (deltaY < 0 && !atTop) return true;
        if (deltaY > 0 && !atBottom) return true;
      }
    }
    node = node.parentElement;
  }
  return false;
}

/**
 * Wheel/trackpad only. Touch stays fully native: driving iOS scroll from JS (preventDefault +
 * scrollTo) fights Safari's momentum and bottom bounce, which shakes fixed layers like the player.
 */
export function bindDampedScroll() {
  let target = window.scrollY;
  let lastWritten = window.scrollY;
  let raf = 0;
  let lastFrame = 0;

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const write = (value: number) => {
    window.scrollTo(0, clampScroll(value));
    lastWritten = window.scrollY;
  };

  const tick = (now: number) => {
    const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0.016;
    lastFrame = now;
    const current = window.scrollY;
    // External scroll (scrollbar / anchoring): adopt it, but keep easing if we still
    // have a farther target — otherwise late layout aborts the wheel short of the bottom.
    if (Math.abs(current - lastWritten) > 1.5) {
      lastWritten = current;
      if (Math.abs(target - current) <= 1.5) {
        target = current;
        raf = 0;
        return;
      }
    }
    target = clampScroll(target);
    const diff = target - current;
    if (Math.abs(diff) < 0.5) {
      if (Math.abs(diff) > 0.05) write(target);
      raf = 0;
      return;
    }
    const step = 1 - Math.exp(-dt / EASE_SECONDS);
    write(current + diff * step);
    raf = requestAnimationFrame(tick);
  };

  const kick = () => {
    if (raf) return;
    lastFrame = 0;
    raf = requestAnimationFrame(tick);
  };

  const onWheel = (event: WheelEvent) => {
    if (scrollLocked()) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.defaultPrevented) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    const delta = event.deltaY * unit;
    if (!delta || nestedScrollable(event.target, delta)) return;
    event.preventDefault();
    if (!raf) target = window.scrollY;
    // Re-read scrollHeight every wheel so late images/footer don't cap the journey short.
    target = clampScroll(target + delta * WHEEL_GAIN);
    kick();
  };

  const onScroll = () => {
    const next = window.scrollY;
    if (Math.abs(next - lastWritten) <= 1.5) return;
    lastWritten = next;
    if (!raf) target = next;
  };

  // A finger on a hybrid device hands control back to native scrolling immediately.
  const onTouchStart = () => {
    stop();
    target = window.scrollY;
    lastWritten = target;
  };

  // Only clamp: re-kicking here would chase the iOS toolbar resize mid-scroll.
  const onResize = () => {
    target = clampScroll(raf ? target : window.scrollY);
  };

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("resize", onResize);

  return () => {
    stop();
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("resize", onResize);
  };
}

/** Slower wheel and trackpad scrolling with a short ease. Touch and the scrollbar stay native. */
export function useDampedScroll() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stop = () => {};
    const sync = () => {
      stop();
      stop = media.matches ? () => {} : bindDampedScroll();
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
      stop();
    };
  }, []);
}
