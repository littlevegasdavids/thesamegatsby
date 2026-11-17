import { ImageResponse } from "next/og";
import { markSrc } from "./marks";
import { token } from "./tokens";

// The home-screen icon: the sparkle on the ground. iOS rounds the corners
// itself, so the square is filled edge to edge.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
// output: export builds a route only if it says it's static.
export const dynamic = "force-static";

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
          background: token("--dg-bg"),
        }}
      >
        <img src={markSrc("sparkle-star")} alt="" width={112} height={112} />
      </div>
    ),
    size,
  );
}
