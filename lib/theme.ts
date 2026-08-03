export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "ulearn-theme";

/**
 * Runs before hydration (see the `beforeInteractive` Script in
 * app/layout.tsx) to set `data-theme` on <html> ahead of first paint —
 * OS preference by default, a stored manual override once the reader
 * has flipped the toggle. Kept as a single inlined string since it must
 * execute standalone, before any module graph loads.
 */
export function themeInitScript(): string {
  return `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var t=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t;}catch(e){}})();`;
}
