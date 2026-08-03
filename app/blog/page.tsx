import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { fetchMediumPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
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
      <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
        Writing, off-site
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
        Longer-form posts live on Medium. This page mirrors that feed directly
        so you don&apos;t have to leave to see what&apos;s there.
      </p>

      <div className="mt-10">
        {!result.ok && (
          <p className="rounded-2xl border border-border bg-panel p-6 text-sm text-text-faint">
            Couldn&apos;t load posts: {result.reason}
          </p>
        )}

        {result.ok && result.posts.length === 0 && (
          <p className="rounded-2xl border border-border bg-panel p-6 text-sm text-text-muted">
            No posts yet.
          </p>
        )}

        {result.ok && result.posts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {result.posts.map((post) => (
              <Link
                key={post.link}
                href={post.link}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex h-full flex-col rounded-2xl border border-border bg-panel p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
              >
                <span className="text-[11px] font-medium tracking-wide text-text-faint uppercase">
                  {formatDate(post.publishedAt)}
                </span>
                <h2 className="mt-3 font-medium text-text">{post.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  {post.description}
                </p>
                <span className="mt-4 text-sm font-medium text-accent group-hover:underline">
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
