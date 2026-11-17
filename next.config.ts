import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pure static export: Workers Static Assets serves ./out, and media comes
  // from R2. There is no server, so no API routes, middleware or ISR.
  output: "export",
  // The default image loader needs a server. This one maps each cover onto
  // the width media-pipeline already built that fills its box.
  images: { loader: "custom", loaderFile: "./src/app/image-loader.ts" },
  experimental: {
    // Turbopack's default merges CSS across routes: once / and /system
    // shared components, it put /system's own 10 KB of CSS in the chunk /
    // loads. graph weighs bytes against requests per route, and at 4 KB a
    // request (the default is 20 KB) it keeps /system's CSS to /system and
    // gives / three files.
    cssChunking: { type: "graph", requestCost: 4000 },
  },
};

export default nextConfig;
