/**
 * Fetches the Medium feed via rss2json.com, which turns the public Medium
 * RSS feed into JSON in exchange for a free-tier API key. Server-side only —
 * the key must never reach the client bundle.
 */
const MEDIUM_USERNAME = "uttamgupta2712";

export type BlogPost = {
  title: string;
  link: string;
  publishedAt: string;
  description: string;
};

export type BlogFeedResult =
  | { ok: true; posts: BlogPost[] }
  | { ok: false; reason: string };

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchMediumPosts(): Promise<BlogFeedResult> {
  const apiKey = process.env.MEDIUM_RSS2JSON_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: "MEDIUM_RSS2JSON_API_KEY is not set." };
  }

  const feedUrl = `https://medium.com/feed/@${MEDIUM_USERNAME}`;
  const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&api_key=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(endpoint, { next: { revalidate: 3600 } });
  } catch {
    return { ok: false, reason: "Could not reach rss2json." };
  }

  if (!res.ok) {
    return { ok: false, reason: `rss2json responded with ${res.status}.` };
  }

  const data = await res.json();
  if (data.status !== "ok") {
    return { ok: false, reason: data.message ?? "rss2json returned an error." };
  }

  const posts: BlogPost[] = (data.items ?? []).map(
    (item: { title: string; link: string; pubDate: string; description: string }) => ({
      title: item.title,
      link: item.link,
      publishedAt: item.pubDate,
      description: stripHtml(item.description).slice(0, 220),
    }),
  );

  return { ok: true, posts };
}
