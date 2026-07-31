"use client";

import { useSyncExternalStore } from "react";

import { THEME_STORAGE_KEY } from "./theme-script";

type Theme = "light" | "dark";

/**
 * Light/dark switch.
 *
 * The source of truth is the `dark` class on <html>, which `<ThemeScript />`
 * sets before first paint. This component subscribes to that class rather than
 * mirroring it into React state, so the two can never drift — and anything
 * else that flips the class (devtools, another tab) is reflected immediately.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";

    // Mutating the class is the state update — the observer re-renders us.
    document.documentElement.classList.toggle("dark", next === "dark");

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Blocked storage (private mode, strict settings): the toggle still
      // works for this session, it just won't be remembered.
    }
  }

  if (theme === null) {
    // Server render and the hydration pass: reserve the footprint so swapping
    // in the real button causes no layout shift.
    return <div className="h-9 w-9" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

/** Watches the `class` attribute on <html> for changes. */
function subscribe(onStoreChange: () => void): () => void {
  const observer = new MutationObserver(onStoreChange);

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * There is no theme during SSR — the class is applied in the browser. Returning
 * `null` makes the placeholder render on the server and during hydration,
 * which is what keeps the markup identical on both sides.
 */
function getServerSnapshot(): Theme | null {
  return null;
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-[1.05rem] w-[1.05rem]"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[1.05rem] w-[1.05rem]"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}
