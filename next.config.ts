import type { NextConfig } from "next";

// `PREVIEW=1 npm run build` produces a fully static export in out/ for
// hosting a clickable preview without a Node server.
const preview = process.env.PREVIEW === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(preview ? { output: "export", trailingSlash: true, assetPrefix: "/yard", images: { unoptimized: true } } : {}),
};

export default nextConfig;
