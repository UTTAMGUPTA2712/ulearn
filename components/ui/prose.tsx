import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Reading column for compiled MDX.
 *
 * All the typography lives in the `.prose` block in `app/globals.css` — this
 * component exists so lesson pages never sprinkle that class name around by
 * hand, and so the wrapper element stays semantic.
 */
export function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("prose", className)}>{children}</div>;
}
