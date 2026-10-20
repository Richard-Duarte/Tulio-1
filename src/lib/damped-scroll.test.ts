import assert from "node:assert/strict";
import { test } from "node:test";
import { bindDampedScroll, pageScrollMax } from "./damped-scroll.ts";

test("pageScrollMax reaches full document bottom (no false shortfall)", () => {
  assert.equal(pageScrollMax(2000, 800), 1200);
  assert.equal(pageScrollMax(800, 800), 0);
  assert.equal(pageScrollMax(500, 800), 0);
});

test("pageScrollMax grows when layout height grows (footer/images)", () => {
  const before = pageScrollMax(1600, 900);
  const afterFooter = pageScrollMax(1600 + 240, 900);
  assert.ok(afterFooter > before);
  assert.equal(afterFooter - before, 240);
});

test("touch scrolling stays native on phones (no JS-driven touchmove / scrollTo)", () => {
  const listeners = new Map<string, { fn: (event: unknown) => void; passive: boolean }>();
  let scrollToCalls = 0;
  const fakeWindow = {
    scrollY: 400,
    innerHeight: 800,
    addEventListener(type: string, fn: (event: unknown) => void, options?: AddEventListenerOptions) {
      listeners.set(type, { fn, passive: options?.passive ?? false });
    },
    removeEventListener(type: string) {
      listeners.delete(type);
    },
    scrollTo() {
      scrollToCalls += 1;
    },
  };
  const g = globalThis as Record<string, unknown>;
  const saved = { window: g["window"], cancelAnimationFrame: g["cancelAnimationFrame"] };
  g["window"] = fakeWindow;
  g["cancelAnimationFrame"] = () => {};
  try {
    const unbind = bindDampedScroll();
    assert.equal(listeners.has("touchmove"), false, "touchmove must not be hijacked");
    assert.equal(listeners.has("touchend"), false);
    const touchStart = listeners.get("touchstart");
    assert.ok(touchStart?.passive, "touchstart must be passive");
    let prevented = false;
    touchStart.fn({ touches: [{ clientX: 0, clientY: 0 }], preventDefault: () => (prevented = true) });
    assert.equal(prevented, false);
    assert.equal(scrollToCalls, 0, "a touch must never write the scroll position");
    unbind();
    assert.equal(listeners.size, 0);
  } finally {
    g["window"] = saved.window;
    g["cancelAnimationFrame"] = saved.cancelAnimationFrame;
  }
});
