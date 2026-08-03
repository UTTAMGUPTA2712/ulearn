import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** The one place that sets horizontal gutters. Fluid by default — panels and diagrams should use the screen, not sit in a narrow column. */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1920px] px-5 sm:px-6 lg:px-10", className)}>
      {children}
    </div>
  );
}
