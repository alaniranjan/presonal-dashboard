import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E tests run a second dev server; a separate build folder keeps it from clashing with `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The dev badge sits on top of the phone bottom navigation.
  devIndicators: false,
};

export default nextConfig;
