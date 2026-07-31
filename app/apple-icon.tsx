import { ImageResponse } from "next/og";

/**
 * Home-screen icon for iOS. Generated rather than checked in so it always
 * matches the brand tokens.
 *
 * `ImageResponse` only supports flexbox and a subset of CSS, so the mark is
 * rebuilt from primitives here instead of reusing `<LogoMark />`.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 55%, #a855f7 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 118,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1,
            marginTop: 14,
          }}
        >
          u
        </div>
        <div
          style={{
            position: "absolute",
            top: 34,
            right: 40,
            width: 26,
            height: 26,
            borderRadius: 26,
            background: "#ffffff",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
