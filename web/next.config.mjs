import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ REQUIRED when importing ../sdk
  experimental: {
    externalDir: true,
  },

  // ✅ Force single React Query instance
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@tanstack/react-query': path.resolve(__dirname, 'node_modules/@tanstack/react-query'),
      'chart.js': path.resolve(__dirname, 'node_modules/chart.js/dist/chart.js'),
    };
    
    // Ensure node_modules is in resolve modules
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      'node_modules',
    ];
    
    return config;
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
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

  output: "standalone",

  generateBuildId: async () => "production-build",

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
    NEXT_PUBLIC_API_BASE:
      process.env.NEXT_PUBLIC_API_BASE || "https://lad-backend-develop-741719885039.us-central1.run.app",
    NEXT_PUBLIC_BACKEND_URL:
      process.env.NEXT_PUBLIC_BACKEND_URL || "https://lad-backend-develop-741719885039.us-central1.run.app",
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "https://lad-backend-develop-741719885039.us-central1.run.app",
    NEXT_PUBLIC_SOCKET_URL:
      process.env.NEXT_PUBLIC_SOCKET_URL || "https://lad-backend-develop-741719885039.us-central1.run.app",
  },
};

export default nextConfig;
