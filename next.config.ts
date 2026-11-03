import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pure static export: Workers Static Assets serves ./out, and media comes
  // from R2. There is no server, so no API routes, middleware or ISR.
  output: "export",
  // Required by `output: 'export'`: the default image loader needs a server.
  // Covers are sized by media-pipeline before they're served.
  images: { unoptimized: true },
};

export default nextConfig;
