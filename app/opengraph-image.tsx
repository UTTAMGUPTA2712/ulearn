import { ImageResponse } from "next/og";

import { topics } from "@/lib/topics";

/**
 * Site-wide social card — inherited by any route that doesn't define its own
 * `opengraph-image`. Restores what the old MDX-era `app/opengraph-image.tsx`
 * did (deleted in the course-content cleanup and never brought back), so
 * links shared to LinkedIn/Slack/etc. show a real preview image again
 * instead of just a title + domain badge.
 */
export const alt = "ulearn/systems — Interactive system architecture demonstrations";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT_FROM = "#60a5fa";
const ACCENT_MID = "#3b82f6";
const ACCENT_TO = "#1d4ed8";

export default function Image() {
  const availableCount = topics.filter((t) => t.status === "available").length;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#0b0f17",
          backgroundImage:
            "radial-gradient(circle at 82% 12%, rgba(76,141,251,0.28), rgba(76,141,251,0) 55%)",
        }}
      >
        {/* Mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg, ${ACCENT_FROM} 0%, ${ACCENT_MID} 55%, ${ACCENT_TO} 100%)`,
            }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path
                d="M12.5 14v7.5a7.5 7.5 0 0 0 15 0V14"
                stroke="#ffffff"
                strokeWidth="4.6"
                strokeLinecap="round"
              />
              <circle cx="27.5" cy="6.7" r="3" fill="#ffffff" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: "#f4f7fb" }}>
            ulearn<span style={{ color: "#6b7787", fontWeight: 400 }}>/systems</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 980 }}>
          <div style={{ display: "flex", fontSize: 60, fontWeight: 600, lineHeight: 1.15, color: "#f4f7fb" }}>
            Interactive system architecture demonstrations
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#9aa5b4" }}>
            Load balancers, rate limiters, message queues — watch the mechanism run, not just read about it.
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              padding: "8px 18px",
              borderRadius: 999,
              background: "rgba(76,141,251,0.14)",
              border: "1px solid rgba(76,141,251,0.4)",
              color: "#8fb7fd",
              fontSize: 20,
              fontWeight: 500,
            }}
          >
            {availableCount} live topics
          </div>
          <div style={{ display: "flex", fontSize: 20, color: "#6b7787" }}>ulearn-it.vercel.app</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
