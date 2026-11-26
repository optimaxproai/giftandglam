/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Nothing here uses next/image; turning the image optimizer off removes an endpoint with known advisories.
  images: { unoptimized: true },
  poweredByHeader: false,
  async headers() {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    ];
    return [
      { source: "/:path*", headers: common },
      // Organizer pages and every API response: never cached, never indexed.
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex" }] },
      // A sponsor's private link and gift list stay out of search results and caches.
      { source: "/mine/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // pdfjs-dist optionally requires node-canvas; we only render PDFs in the browser.
    config.resolve.alias.canvas = false;
    return config;
  },
};
export default nextConfig;
