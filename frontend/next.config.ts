import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile the shared @hosmos/types package from the monorepo
  transpilePackages: ["@hosmos/types"],
};

export default nextConfig;
