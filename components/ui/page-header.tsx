import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type PageHeaderProps = {
  /** Small uppercase label above the title. */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Badges, meta or actions rendered under the description. */
  children?: ReactNode;
  className?: string;
};

/** Consistent top-of-page block for every route that isn't the homepage. */
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("animate-rise", className)}>
      {eyebrow && (
        <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-pretty text-ink-muted">
          {description}
        </p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
