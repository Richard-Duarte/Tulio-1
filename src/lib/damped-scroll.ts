import { useEffect } from "react";

/** Fraction of each wheel delta that reaches the page. */
const WHEEL_GAIN = 0.5;
/** Fraction of each touch delta. Higher than wheel so a finger still tracks. */
const TOUCH_GAIN = 0.62;
/** Seconds for the scroll position to catch the wheel target. */
const EASE_SECONDS = 0.12;

function maxScroll() {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
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

function bindDampedScroll() {
  let target = window.scrollY;
  let lastWritten = window.scrollY;
  let raf = 0;
  let lastFrame = 0;
  let touching = false;
  let gesture: "undecided" | "vertical" | "horizontal" = "undecided";
  let originX = 0;
  let originY = 0;
  let lastTouchY = 0;
  let touchTime = 0;
  let touchVelocity = 0;

  const write = (value: number) => {
    window.scrollTo(0, clampScroll(value));
    lastWritten = window.scrollY;
  };

  const tick = (now: number) => {
    const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0.016;
    lastFrame = now;
    const current = window.scrollY;
    if (Math.abs(current - lastWritten) > 1.5) {
      target = current;
      lastWritten = current;
      raf = 0;
      return;
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
    if (touching || scrollLocked()) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.defaultPrevented) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    const delta = event.deltaY * unit;
    if (!delta || nestedScrollable(event.target, delta)) return;
    event.preventDefault();
    target = clampScroll(target + delta * WHEEL_GAIN);
    kick();
  };

  const onScroll = () => {
    const next = window.scrollY;
    if (Math.abs(next - lastWritten) <= 1.5) return;
    target = next;
    lastWritten = next;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1 || scrollLocked()) {
      touching = false;
      return;
    }
    const touch = event.touches[0];
    if (!touch) return;
    gesture = "undecided";
    touching = true;
    originX = touch.clientX;
    originY = touch.clientY;
    lastTouchY = touch.clientY;
    touchTime = performance.now();
    touchVelocity = 0;
    target = window.scrollY;
    lastWritten = target;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!touching || event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (!touch) return;
    const travelX = touch.clientX - originX;
    const travelY = touch.clientY - originY;
    if (gesture === "undecided") {
      if (Math.hypot(travelX, travelY) < 3) return;
      gesture = Math.abs(travelY) >= Math.abs(travelX) ? "vertical" : "horizontal";
    }
    if (gesture !== "vertical") return;
    const step = lastTouchY - touch.clientY;
    lastTouchY = touch.clientY;
    if (!step) return;
    if (nestedScrollable(event.target, step)) {
      touching = false;
      gesture = "undecided";
      return;
    }
    event.preventDefault();
    const now = performance.now();
    const elapsed = Math.max(8, now - touchTime);
    const scaled = step * TOUCH_GAIN;
    touchVelocity = scaled / elapsed;
    touchTime = now;
    target = clampScroll(target + scaled);
    write(target);
  };

  const onTouchEnd = () => {
    if (!touching) return;
    const coast = gesture === "vertical";
    touching = false;
    gesture = "undecided";
    if (!coast || Math.abs(touchVelocity) < 0.02) return;
    target = clampScroll(target + touchVelocity * 140);
    kick();
  };

  const onResize = () => {
    target = clampScroll(target);
  };

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("touchcancel", onTouchEnd, { passive: true });
  window.addEventListener("resize", onResize);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("touchcancel", onTouchEnd);
    window.removeEventListener("resize", onResize);
  };
}

/** Slower wheel, trackpad, and touch scrolling with a short ease. The scrollbar stays native. */
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
