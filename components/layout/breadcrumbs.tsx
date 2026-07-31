import Link from "next/link";
import { Fragment } from "react";

export type Crumb = {
  name: string;
  path: string;
};

/**
 * Visible breadcrumb trail.
 *
 * Pass the same `trail` to `breadcrumbSchema()` so the rendered trail and the
 * structured data can never disagree.
 */
export function Breadcrumbs({ trail }: { trail: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-subtle">
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;

          return (
            <Fragment key={crumb.path}>
              <li>
                {isLast ? (
                  <span aria-current="page" className="text-ink-muted">
                    {crumb.name}
                  </span>
                ) : (
                  <Link href={crumb.path} className="transition-colors hover:text-ink">
                    {crumb.name}
                  </Link>
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true" className="text-line-strong">
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
