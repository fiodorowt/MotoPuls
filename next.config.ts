import type { NextConfig } from "next";

// Nagłówki statyczne; Content-Security-Policy z jednorazowym nonce ustawia src/proxy.ts.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

// Testy E2E budują aplikację do osobnego katalogu, żeby nie kolidować z działającym `next dev`.
const e2eDistDir = process.env.NEXT_DIST_DIR;

const config: NextConfig = {
  ...(e2eDistDir ? { distDir: e2eDistDir } : { output: "standalone" as const }),
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@node-rs/argon2", "sharp", "pg", "nodemailer"],
  experimental: {
    // Zdjęcia do galerii wysyłane są przez akcję serwerową (limit pliku: 5 MB)
    serverActions: { bodySizeLimit: "6mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/rezerwacja/:token", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/img/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default config;
