import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  compiler: {
    styledComponents: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
  },
  // Disable caching for development and ensure proper updates
  output: 'standalone',
  // Disable static optimization to ensure dynamic rendering
  experimental: {
    // Disable caching for API routes
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Add cache control headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
  // Proxy radio server requests to avoid Mixed Content errors
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: 'http://194.87.141.114:7777/socket.io/:path*',
      },
      {
        source: '/radio/:path*',
        destination: 'http://194.87.141.114:7777/radio/:path*',
      },
    ];
  },
};

export default nextConfig;
