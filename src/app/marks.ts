import { readFileSync } from "node:fs";
import { join } from "node:path";

// The outlined marks as data URIs, for the images next/og draws at build. Its
// renderer can't read the site's WOFF2 fonts, so the wordmark goes in as the
// SVG it already is. Server-only: it reads a file.

export function markSrc(name: "wordmark" | "sparkle-star"): string {
  const svg = readFileSync(join(process.cwd(), "src/design-system/assets", `${name}.svg`));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}
