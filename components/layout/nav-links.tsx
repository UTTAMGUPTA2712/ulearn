"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { mainNav } from "@/lib/site";
import { cn } from "@/lib/utils/cn";

/**
 * Primary nav with active-route highlighting.
 *
 * This is the only part of the header that needs the current pathname, so
 * `"use client"` stops here rather than at the header — keeping the rest of
 * the shell on the server.
 */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {mainNav.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent-soft text-accent-ink"
                : "text-ink-muted hover:bg-canvas hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
