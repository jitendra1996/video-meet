import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@100mslive/react-sdk", "@100mslive/hms-video-store"],
};

export default nextConfig;
