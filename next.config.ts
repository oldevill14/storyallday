import type { NextConfig } from "next";

// Static export for GitHub Pages (served under /storyallday/).
// - `output: 'export'` → emits a fully static site to ./out (no Node server).
// - `images.unoptimized` → the default next/image optimizer needs a server; off for export.
// - basePath/assetPrefix → all routes + assets are prefixed for the project subpath.
// - trailingSlash → emit `route/index.html` so Pages serves clean URLs without a server.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: "/storyallday",
  assetPrefix: "/storyallday",
  trailingSlash: true,
};

export default nextConfig;
