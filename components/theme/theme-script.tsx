/** localStorage key shared by the inline script and the toggle component. */
export const THEME_STORAGE_KEY = "ulearn-theme";

/**
 * Applies the stored (or system) theme before first paint.
 *
 * This has to be a blocking inline script in <head>: any React-based approach
 * runs after hydration, which means a visible flash of the wrong theme.
 */
const script = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (stored !== 'light' && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
