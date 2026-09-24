"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Shared by every topic whose simulation animates — tick-based engines pass
 * it through to skip their travel phases, purely decorative loops use it to
 * drop their pulse. `useSyncExternalStore`
 * (rather than a `useEffect` + `setState`) is the React-idiomatic way to
 * subscribe to this kind of external browser state.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
