/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // pdfjs-dist optionally requires node-canvas; we only render PDFs in the browser.
    config.resolve.alias.canvas = false;
    return config;
  },
};
export default nextConfig;
