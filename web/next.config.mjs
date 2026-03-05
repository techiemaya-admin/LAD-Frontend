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

  // ✅ Use webpack instead - it handles monorepo workspace packages correctly
  webpack: (config, { isServer }) => {
    // Force all @tanstack/react-query imports to use root node_modules (monorepo setup)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@tanstack/react-query': path.resolve(__dirname, '../node_modules/@tanstack/react-query'),
      '@tanstack/query-core': path.resolve(__dirname, '../node_modules/@tanstack/query-core'),
      'chart.js': path.resolve(__dirname, 'node_modules/chart.js/dist/chart.js'),
      '@lad/frontend-features': path.resolve(__dirname, '../sdk'),
      '@lad/frontend-features/ai-icp-assistant': path.resolve(__dirname, '../sdk/features/ai-icp-assistant'),
      '@lad/frontend-features/billing': path.resolve(__dirname, '../sdk/features/billing'),
      '@lad/frontend-features/campaigns': path.resolve(__dirname, '../sdk/features/campaigns'),
      '@lad/sdk/features/ai-icp-assistant': path.resolve(__dirname, '../sdk/features/ai-icp-assistant'),
      '@lad/frontend-features/conversations': path.resolve(__dirname, '../sdk/features/conversations'),
      '@lad/frontend-features/overview': path.resolve(__dirname, '../sdk/features/overview'),
      '@lad/frontend-features/voice-agent': path.resolve(__dirname, '../sdk/features/voice-agent'),
      '@lad/frontend-features/deals-pipeline': path.resolve(__dirname, '../sdk/features/deals-pipeline'),
      '@lad/frontend-features/apollo-leads': path.resolve(__dirname, '../sdk/features/apollo-leads'),
      '@lad/frontend-features/dashboard': path.resolve(__dirname, '../sdk/features/dashboard'),
    };

    return config;
  },

  // Allow Turbopack build - use relative paths (Turbopack doesn't support absolute paths)
  turbopack: {
    resolveAlias: {
      // Force all @tanstack/react-query imports to use root node_modules (monorepo setup)
      '@tanstack/react-query': '../node_modules/@tanstack/react-query',
      '@tanstack/query-core': '../node_modules/@tanstack/query-core',
      'chart.js': './node_modules/chart.js/dist/chart.js',
      '@lad/frontend-features': '../sdk',
      '@lad/frontend-features/ai-icp-assistant': '../sdk/features/ai-icp-assistant',
      '@lad/frontend-features/billing': '../sdk/features/billing',
      '@lad/frontend-features/campaigns': '../sdk/features/campaigns',
      '@lad/sdk/features/ai-icp-assistant': '../sdk/features/ai-icp-assistant',
      '@lad/frontend-features/conversations': '../sdk/features/conversations',
      '@lad/frontend-features/overview': '../sdk/features/overview',
      '@lad/frontend-features/voice-agent': '../sdk/features/voice-agent',
      '@lad/frontend-features/deals-pipeline': '../sdk/features/deals-pipeline',
      '@lad/frontend-features/apollo-leads': '../sdk/features/apollo-leads',
      '@lad/frontend-features/dashboard': '../sdk/features/dashboard',
    },
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

  // Removed hardcoded env overrides - rely on .env.local instead
  // This allows local development to use localhost URLs from .env.local
  // env: {
  //   NEXT_PUBLIC_API_BASE:
  //     process.env.NEXT_PUBLIC_API_BASE || "https://lad-backend-develop-741719885039.us-central1.run.app",
  //   NEXT_PUBLIC_BACKEND_URL:
  //     process.env.NEXT_PUBLIC_BACKEND_URL || "https://lad-backend-develop-741719885039.us-central1.run.app",
  //   NEXT_PUBLIC_API_URL:
  //     process.env.NEXT_PUBLIC_API_URL || "https://lad-backend-develop-741719885039.us-central1.run.app",
  //   NEXT_PUBLIC_SOCKET_URL:
  //     process.env.NEXT_PUBLIC_SOCKET_URL || "https://lad-backend-develop-741719885039.us-central1.run.app",
  // },
};

export default nextConfig;
