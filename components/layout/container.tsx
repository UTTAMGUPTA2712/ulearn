import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** The one place that sets horizontal gutters. Wide by default — panels and diagrams need the room. */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}
