import Link from "next/link";

import { topics } from "@/lib/topics";
import { cn } from "@/lib/utils/cn";

/**
 * Cross-link to another topic that only becomes a link once that topic is
 * `status: "available"` in `lib/topics.ts`. Until then it renders as plain
 * text marked "planned", so a forward reference (e.g. Hashing → Consistent
 * Hashing) never points at a 404 and switches on by itself when the topic
 * ships.
 */
export function TopicLink({
  slug,
  children,
  className,
}: {
  slug: string;
  children: React.ReactNode;
  className?: string;
}) {
  const topic = topics.find((t) => t.slug === slug);

  if (topic?.status !== "available") {
    return (
      <span className={cn("font-medium text-text", className)}>
        {children} <span className="text-text-faint">(planned)</span>
      </span>
    );
  }

  return (
    <Link href={`/topics/${slug}`} className={cn("font-medium text-accent hover:underline", className)}>
      {children}
    </Link>
  );
}
