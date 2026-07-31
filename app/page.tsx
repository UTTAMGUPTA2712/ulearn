import Link from "next/link";

import { Container } from "@/components/layout/container";
import { StatusDot } from "@/components/ui/status-dot";
import { topics } from "@/lib/topics";

export default function HomePage() {
  return (
    <Container className="py-14">
      <p className="font-mono text-xs text-accent">$ ulearn --list-topics</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
        System architectures, taken apart live
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
        Every topic below is a running simulation, not a page of prose. Pick one,
        switch its behaviour, break it on purpose, and watch what actually
        happens.
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {topics.map((topic) => {
          const isAvailable = topic.status === "available";
          const card = (
            <div
              className={`group flex h-full flex-col rounded-lg border border-border bg-panel p-5 transition-colors ${
                isAvailable ? "hover:border-border-strong" : "opacity-60"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] tracking-wide text-text-faint uppercase">
                  {topic.category}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-text-faint">
                  <StatusDot status={isAvailable ? "up" : "idle"} />
                  {isAvailable ? "available" : "planned"}
                </span>
              </div>

              <h2 className="mt-3 font-medium text-text">{topic.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{topic.tagline}</p>

              {isAvailable && (
                <span className="mt-4 font-mono text-xs text-accent group-hover:underline">
                  open simulation →
                </span>
              )}
            </div>
          );

          return (
            <div key={topic.slug}>
              {isAvailable ? (
                <Link href={`/topics/${topic.slug}`} className="block h-full">
                  {card}
                </Link>
              ) : (
                card
              )}
            </div>
          );
        })}
      </div>
    </Container>
  );
}
