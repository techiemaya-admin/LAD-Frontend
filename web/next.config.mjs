/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure Turbopack root - use current dir in production, workspace root in dev
  turbopack: {
    root: process.env.NODE_ENV === 'production' ? '.' : '../..',
  },
  // Disable caching during development to prevent stale code issues
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  generateBuildId: async () => {
    return 'production-build'
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "agent.techiemaya.com",
        pathname: "/assets/**",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3004",
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3004",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004",
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3004",
  },
};

export default nextConfig;
