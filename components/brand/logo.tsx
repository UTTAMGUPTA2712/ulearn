import { cn } from "@/lib/utils/cn";
import { siteConfig } from "@/lib/site";

/**
 * The ulearn mark: a lowercase "u" — for Uttam, and for "you" — with a rising
 * spark above its open stem. The open bowl reads as "unfinished, still
 * learning"; the spark is the moment it clicks.
 *
 * Geometry is tuned to stay legible down to 16px, so the strokes are heavy
 * and the spark keeps a deliberate gap from the stem.
 */

type LogoMarkProps = {
  className?: string;
  /**
   * SVG gradient ids are document-global. The default is fine when every mark
   * on the page is identical; pass a unique id if you ever render a recoloured
   * variant alongside the standard one.
   */
  gradientId?: string;
  /** Renders the glyph in `currentColor` instead of the brand gradient. */
  monochrome?: boolean;
};

export function LogoMark({
  className,
  gradientId = "ulearn-mark-gradient",
  monochrome = false,
}: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={cn("h-9 w-9", className)}
    >
      {!monochrome && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="55%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      )}

      {/* Tile */}
      <rect
        width="40"
        height="40"
        rx="11"
        fill={monochrome ? "currentColor" : `url(#${gradientId})`}
      />

      {/* The "u" — an open bowl with two stems */}
      <path
        d="M12.5 14v7.5a7.5 7.5 0 0 0 15 0V14"
        fill="none"
        stroke={monochrome ? "#fff" : "#ffffff"}
        strokeWidth="4.6"
        strokeLinecap="round"
        opacity={monochrome ? 0.9 : 1}
      />

      {/* The spark: the idea landing above the open stem */}
      <circle cx="27.5" cy="6.7" r="3" fill="#ffffff" />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  /** Hides the wordmark, e.g. on narrow viewports. */
  markOnly?: boolean;
};

/** Mark plus wordmark. Used in the header, footer and 404. */
export function Logo({ className, markOnly = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-8 w-8 shrink-0" />
      {!markOnly && (
        <span className="text-[1.35rem] font-semibold tracking-tight text-ink">
          {siteConfig.name}
        </span>
      )}
      <span className="sr-only">{siteConfig.name} home</span>
    </span>
  );
}
