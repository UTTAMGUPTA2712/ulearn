/** Turns a heading like "DDoS traffic" into a URL-safe anchor id: "ddos-traffic". */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
