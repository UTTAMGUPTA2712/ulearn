"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

export type TopicTab = { href: string; label: string };

/** Simulate/Study-style pill nav used at the top of every topic page. */
export function TopicTabs({ tabs }: { tabs: TopicTab[] }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 rounded-full border border-border bg-panel p-1">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              isActive ? "bg-accent text-accent-foreground" : "text-text-muted hover:text-text",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
