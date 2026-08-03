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
    return fetchDirectRss();
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

async function fetchDirectRss(): Promise<BlogFeedResult> {
  const feedUrl = `https://medium.com/feed/@${MEDIUM_USERNAME}`;
  try {
    const res = await fetch(feedUrl, { next: { revalidate: 3600 } });
    if (!res.ok) {
      return { ok: false, reason: `Medium RSS responded with status ${res.status}.` };
    }
    const xml = await res.text();
    const posts = parseRssXml(xml);
    return { ok: true, posts };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Could not reach Medium RSS.";
    return { ok: false, reason };
  }
}

function parseRssXml(xml: string): BlogPost[] {
  const posts: BlogPost[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemContent = match[1];
    
    // Extract title
    const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/title>/);
    const title = (titleMatch ? (titleMatch[1] || titleMatch[2]) : "").trim();
    
    // Extract link
    const linkMatch = itemContent.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/link>/);
    const link = (linkMatch ? (linkMatch[1] || linkMatch[2]) : "").trim();
    
    // Extract pubDate
    const pubDateMatch = itemContent.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/pubDate>/);
    const publishedAt = (pubDateMatch ? (pubDateMatch[1] || pubDateMatch[2]) : "").trim();
    
    // Extract description (prefer content:encoded, fallback to description)
    const contentMatch = itemContent.match(/<content:encoded>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/content:encoded>/);
    const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/description>/);
    
    const rawDesc = (contentMatch ? (contentMatch[1] || contentMatch[2]) : (descMatch ? (descMatch[1] || descMatch[2]) : "")).trim();
    const description = stripHtml(rawDesc).slice(0, 220);
    
    if (title && link) {
      posts.push({ title, link, publishedAt, description });
    }
  }
  
  return posts;
}
