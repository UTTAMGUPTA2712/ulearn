import { cn } from "@/lib/utils/cn";

/**
 * The ulearn mark: a lowercase "u" — for Uttam, and for "you" — with a rising
 * spark above its open stem. The open bowl reads as "unfinished, still
 * learning"; the spark is the moment it clicks.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={cn("h-9 w-9", className)}
    >
      <defs>
        <linearGradient id="ulearn-mark-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="55%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      <rect width="40" height="40" rx="11" fill="url(#ulearn-mark-gradient)" />

      <path
        d="M12.5 14v7.5a7.5 7.5 0 0 0 15 0V14"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4.6"
        strokeLinecap="round"
      />

      <circle cx="27.5" cy="6.7" r="3" fill="#ffffff" />
    </svg>
  );
}

/** Mark plus wordmark. Used in the top nav. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="h-7 w-7 shrink-0" />
      <span className="text-base font-semibold tracking-tight text-text">
        ulearn<span className="font-normal text-text-faint">/systems</span>
      </span>
    </span>
  );
}
