/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const api = process.env.API_PROXY_TARGET || "http://127.0.0.1:3001";
    return [{ source: "/v1/:path*", destination: `${api}/v1/:path*` }];
  },
};

module.exports = nextConfig;
