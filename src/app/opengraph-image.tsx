import { ImageResponse } from "next/og";
import { markSrc } from "./marks";
import { token } from "./tokens";

// The share card: the wordmark and the sparkle on the night-sky ground, with
// no other text (SPEC-site.md). Rendered once at build into out/.
export const alt = "Déjà Gatsby";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// output: export builds a route only if it says it's static.
export const dynamic = "force-static";

// wordmark.svg's own viewBox is 6190 × 910.
const WORDMARK = { width: 880, height: Math.round((880 * 910) / 6190) };
const STAR = 88;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(70% 70% at 50% 40%, ${token("--dg-surface")}, ${token("--dg-bg")})`,
        }}
      >
        <div style={{ display: "flex", position: "relative" }}>
          <img src={markSrc("wordmark")} alt="" width={WORDMARK.width} height={WORDMARK.height} />
          <img
            src={markSrc("sparkle-star")}
            alt=""
            width={STAR}
            height={STAR}
            style={{ position: "absolute", top: -STAR * 0.75, right: -STAR * 0.5 }}
          />
        </div>
      </div>
    ),
    size,
  );
}
