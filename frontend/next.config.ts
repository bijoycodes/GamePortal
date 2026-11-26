import type { NextConfig } from "next";

// Dev-only: Next 16 blocks dev assets/HMR from hostnames other than the one it was
// started with. Entries are hostnames only (no scheme or port). Override with a
// comma-separated list when developing from another device or a tunnel.
const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "10.10.10.246")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // E2E uses a separate distDir so its dev lock does not conflict with `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), camera=(), microphone=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
