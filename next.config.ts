import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Disable some caching for development
  experimental: {
    // Force file system watching
    // This should help with hot reload issues
  },
};

export default nextConfig;
