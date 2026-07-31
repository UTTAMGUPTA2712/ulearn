/**
 * Formats an ISO date (YYYY-MM-DD) for display.
 *
 * Pinned to UTC and en-US so the server-rendered string always matches what
 * the client would produce — a locale-dependent format causes hydration
 * mismatches on statically generated pages.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "3 lessons" / "1 lesson" */
export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
