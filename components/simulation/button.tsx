import { cn } from "@/lib/utils/cn";

/**
 * Generic control button used across every topic's simulation panel:
 * rounded-full, outlined by default, filled when `active` (or always-filled
 * when `primary`). `danger` swaps the accent color for `--status-down`,
 * consistent with §4/§10 of the design system — used for destructive
 * actions like "Kill".
 */
export function Button({
  active,
  danger,
  primary,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  danger?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
        primary
          ? "border-accent bg-accent text-accent-foreground hover:opacity-90"
          : active
            ? danger
              ? "border-status-down bg-status-down/15 text-status-down"
              : "border-accent bg-accent/15 text-accent"
            : "border-border text-text-muted hover:border-border-strong hover:text-text",
        className,
      )}
      {...props}
    />
  );
}
