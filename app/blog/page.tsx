import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { fetchMediumPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog · ulearn/systems",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function BlogPage() {
  const result = await fetchMediumPosts();

  return (
    <Container className="py-14">
      <p className="font-mono text-xs text-accent">$ ulearn --fetch-posts</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
        Writing, off-site
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
        Longer-form posts live on Medium. This page mirrors that feed directly
        so you don&apos;t have to leave to see what&apos;s there.
      </p>

      <div className="mt-10">
        {!result.ok && (
          <p className="rounded-lg border border-border bg-panel p-5 font-mono text-xs text-text-faint">
            Couldn&apos;t load posts: {result.reason}
          </p>
        )}

        {result.ok && result.posts.length === 0 && (
          <p className="rounded-lg border border-border bg-panel p-5 text-sm text-text-muted">
            No posts yet.
          </p>
        )}

        {result.ok && result.posts.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {result.posts.map((post) => (
              <Link
                key={post.link}
                href={post.link}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex h-full flex-col rounded-lg border border-border bg-panel p-5 transition-colors hover:border-border-strong"
              >
                <span className="font-mono text-[11px] tracking-wide text-text-faint uppercase">
                  {formatDate(post.publishedAt)}
                </span>
                <h2 className="mt-3 font-medium text-text">{post.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  {post.description}
                </p>
                <span className="mt-4 font-mono text-xs text-accent group-hover:underline">
                  read on medium →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
