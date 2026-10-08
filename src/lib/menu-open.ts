import { useSyncExternalStore } from "react";

const EVENT = "tulio-menu-open";

export function setMenuOpen(next: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.toggleAttribute("data-menu-open", next);
  document.dispatchEvent(new Event(EVENT));
}

function subscribe(listener: () => void) {
  document.addEventListener(EVENT, listener);
  return () => document.removeEventListener(EVENT, listener);
}

export function useMenuOpen() {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.hasAttribute("data-menu-open"),
    () => false,
  );
}
