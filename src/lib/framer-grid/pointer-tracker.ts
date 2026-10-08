import * as THREE from "three";

export type PointerTracker = {
  position: THREE.Vector2;
  nPosition: THREE.Vector2;
  hover: boolean;
  pressed: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onMove: () => void;
  onDown: () => void;
  onUp: () => void;
  onClick: () => void;
  dispose: () => void;
};

const trackers = new Map<HTMLElement, PointerTracker>();
const client = new THREE.Vector2();
let listenersAttached = false;

function updateNormalized(tracker: PointerTracker, rect: DOMRect) {
  tracker.position.x = client.x - rect.left;
  tracker.position.y = client.y - rect.top;
  tracker.nPosition.x = (tracker.position.x / rect.width) * 2 - 1;
  tracker.nPosition.y = (-tracker.position.y / rect.height) * 2 + 1;
}

function hit(rect: DOMRect) {
  const { x, y } = client;
  return x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height;
}

function forEachTracker(fn: (tracker: PointerTracker, rect: DOMRect) => void) {
  client.x = 0;
  client.y = 0;
  for (const [el, tracker] of trackers) {
    fn(tracker, el.getBoundingClientRect());
  }
}

function onPointerMove(e: PointerEvent) {
  client.x = e.clientX;
  client.y = e.clientY;
  for (const [el, tracker] of trackers) {
    const rect = el.getBoundingClientRect();
    if (hit(rect)) {
      updateNormalized(tracker, rect);
      if (!tracker.hover) {
        tracker.hover = true;
        tracker.onEnter();
      }
      tracker.pressed = e.buttons > 0;
      tracker.onMove();
    } else if (tracker.hover) {
      tracker.hover = false;
      tracker.pressed = false;
      tracker.onLeave();
    }
  }
}

function onPointerLeaveBody() {
  for (const tracker of trackers.values()) {
    if (tracker.hover) {
      tracker.hover = false;
      tracker.onLeave();
    }
  }
}

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  document.body.addEventListener("pointermove", onPointerMove);
  document.body.addEventListener("pointerleave", onPointerLeaveBody);
}

function detachListeners() {
  if (!listenersAttached || trackers.size > 0) return;
  listenersAttached = false;
  document.body.removeEventListener("pointermove", onPointerMove);
  document.body.removeEventListener("pointerleave", onPointerLeaveBody);
}

export function createPointerTracker(options: { domElement: HTMLCanvasElement }): PointerTracker {
  const tracker: PointerTracker = {
    position: new THREE.Vector2(),
    nPosition: new THREE.Vector2(),
    hover: false,
    pressed: false,
    onEnter: () => {},
    onLeave: () => {},
    onMove: () => {},
    onDown: () => {},
    onUp: () => {},
    onClick: () => {},
    dispose: () => {
      trackers.delete(options.domElement);
      detachListeners();
    },
  };
  trackers.set(options.domElement, tracker);
  attachListeners();
  return tracker;
}
