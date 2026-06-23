import type { NextConfig } from "next";

// Static export for GitHub Pages (prompt-only build — no server / no API routes).
// Served under /storyallday/. The AI calls go directly from the browser to the
// provider using the user's own API key (see lib/ai.ts).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/storyallday";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
