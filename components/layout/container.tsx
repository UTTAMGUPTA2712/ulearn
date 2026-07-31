import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type ContainerProps = {
  children: ReactNode;
  className?: string;
  /** `wide` for grids and landing sections, `prose` for reading columns. */
  width?: "default" | "wide" | "prose";
  as?: ElementType;
};

const widths = {
  default: "max-w-5xl",
  wide: "max-w-6xl",
  prose: "max-w-3xl",
} as const;

/** The single source of horizontal rhythm. Nothing else sets page gutters. */
export function Container({
  children,
  className,
  width = "default",
  as: Tag = "div",
}: ContainerProps) {
  return (
    <Tag className={cn("mx-auto w-full px-5 sm:px-6 lg:px-8", widths[width], className)}>
      {children}
    </Tag>
  );
}
