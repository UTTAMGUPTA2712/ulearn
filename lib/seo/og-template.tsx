import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

/** Shared canvas size for every Open Graph and Twitter card. */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/**
 * Accent hexes for OG cards. Duplicated from `globals.css` on purpose:
 * `ImageResponse` runs in an isolated renderer with no access to CSS custom
 * properties, so it needs literal values. Keep the two lists in sync.
 */
const OG_ACCENTS: Record<string, string> = {
  indigo: "#818cf8",
  emerald: "#34d399",
  amber: "#fbbf24",
  rose: "#fb7185",
  sky: "#38bdf8",
  violet: "#a78bfa",
};

type OgCardOptions = {
  /** Small label above the title, e.g. the topic name or "Topic". */
  eyebrow?: string;
  title: string;
  /** Optional supporting line below the title. Truncated by the layout. */
  subtitle?: string;
  /** Accent key from `ACCENTS`; falls back to indigo. */
  accent?: string;
  /** Bottom-right meta line, e.g. "3 lessons · 21 min". */
  footnote?: string;
};

/**
 * Renders the site's standard social card.
 *
 * Every `opengraph-image.tsx` in the app delegates here so all cards share one
 * layout — only the text and accent change.
 *
 * `ImageResponse` supports flexbox and a subset of CSS only: no grid, and any
 * element with more than one child needs an explicit `display: flex`.
 */
export function renderOgCard({
  eyebrow,
  title,
  subtitle,
  accent = "indigo",
  footnote,
}: OgCardOptions) {
  const accentColor = OG_ACCENTS[accent] ?? OG_ACCENTS.indigo;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0b0b10",
          color: "#ecedf2",
          position: "relative",
        }}
      >
        {/* Accent glow. A radial gradient, not a circle with a blur —
            `filter` is unsupported here, so a blurred shape would render
            with a hard edge. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: `radial-gradient(circle at 82% 6%, ${accentColor}33 0%, ${accentColor}0d 34%, transparent 58%)`,
          }}
        />
        {/* Accent rule along the top edge */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 8,
            background: accentColor,
          }}
        />

        {/* Brand lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 19,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 55%, #a855f7 100%)",
              fontSize: 44,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            u
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 600, letterSpacing: -0.5 }}>
            {siteConfig.name}
          </div>
        </div>

        {/* Headline block */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 940 }}>
          {eyebrow && (
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: accentColor,
                marginBottom: 20,
              }}
            >
              {eyebrow}
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontSize: title.length > 46 ? 62 : 74,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -2,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                display: "flex",
                fontSize: 28,
                lineHeight: 1.45,
                color: "#a1a1ae",
                marginTop: 24,
              }}
            >
              {truncate(subtitle, 118)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: "#71717f",
          }}
        >
          <div style={{ display: "flex" }}>{siteConfig.url.replace(/^https?:\/\//, "")}</div>
          {footnote && <div style={{ display: "flex" }}>{footnote}</div>}
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}
