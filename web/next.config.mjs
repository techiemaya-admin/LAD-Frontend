import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@lad/frontend-features'],
  // ✅ REQUIRED when importing ../sdk
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@tabler/icons-react',
      'recharts',
      'date-fns',
      'framer-motion',
    ],
    // Raise the middleware/proxy request-body cap (Next default 10MB) so large
    // multipart uploads survive the middleware layer. Media uploads (e.g.
    // LinkedIn template videos) are capped at 25MB by the backend; 30MB leaves
    // headroom for multipart boundary overhead. Without this, bodies >10MB are
    // truncated and the upload proxy's `req.formData()` throws → "Internal error".
    // NB: must live under `experimental` (top-level is ignored); the modern key
    // is `proxyClientMaxBodySize` (replaces the deprecated middlewareClientMaxBodySize).
    proxyClientMaxBodySize: '30mb',
  },

  // ✅ REQUIRED for monorepo standalone output.
  // Next.js traces file dependencies starting from this directory.
  // Without this, the tracer starts from /app/web and cannot reach ../sdk
  // or root node_modules, so .next/standalone/ is never generated.
  outputFileTracingRoot: path.resolve(__dirname, '..'),

  // ✅ Use webpack instead - it handles monorepo workspace packages correctly
  webpack: (config, { isServer }) => {
    // Force all @tanstack/react-query imports to use root node_modules (monorepo setup)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@tanstack/react-query': path.resolve(__dirname, '../node_modules/@tanstack/react-query'),
      '@tanstack/query-core': path.resolve(__dirname, '../node_modules/@tanstack/query-core'),
      '@lad/shared': path.resolve(__dirname, '../sdk/shared'),
      'chart.js': path.resolve(__dirname, 'node_modules/chart.js/dist/chart.js'),
      '@livekit/components-react': path.resolve(__dirname, '../node_modules/@livekit/components-react'),
      '@livekit/components-styles': path.resolve(__dirname, '../node_modules/@livekit/components-styles'),
      'livekit-client': path.resolve(__dirname, '../node_modules/livekit-client'),
    };

    // Use browser-compatible exceljs build on client side
    if (!isServer) {
      config.resolve.alias['exceljs'] = path.resolve(__dirname, '../node_modules/exceljs/dist/exceljs.min.js');
    }

    return config;
  },

  // Turbopack monorepo build & HMR configuration
  turbopack: {
    root: path.resolve(__dirname, '..'),
    resolveAlias: {
      // Force all @tanstack/react-query imports to use root node_modules (monorepo setup)
      '@tanstack/react-query': '../node_modules/@tanstack/react-query',
      '@tanstack/query-core': '../node_modules/@tanstack/query-core',
      '@lad/shared': '../sdk/shared',
      'chart.js': './node_modules/chart.js/dist/chart.js',
      '@livekit/components-react': '../node_modules/@livekit/components-react',
      '@livekit/components-styles': '../node_modules/@livekit/components-styles',
      'livekit-client': '../node_modules/livekit-client',
    },
  },

  // Proxy OAuth callback routes to the backend.
  // Google / Microsoft redirect the browser back to the frontend domain
  // (web.mrlads.com/api/social-integration/email/{provider}/callback) because
  // that URL is registered as the authorized redirect URI in Google Cloud Console
  // and Azure Portal. The actual handler lives on the backend, so we transparently
  // forward the request - including all query params (code, state, etc.)  - 
  // to the backend. The backend then redirects the user back to the frontend
  // settings page upon success.
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const playgroundWorkerUrl =
      process.env.NEXT_PUBLIC_PLAYGROUND_WORKER_URL || 'http://localhost:8080';
    return [
      {
        source: '/api/social-integration/email/google/callback',
        destination: `${backendUrl}/api/social-integration/email/google/callback`,
      },
      {
        source: '/api/social-integration/email/microsoft/callback',
        destination: `${backendUrl}/api/social-integration/email/microsoft/callback`,
      },
      {
        source: '/playground-media/media/:path*',
        destination: `${playgroundWorkerUrl}/playground-media/media/:path*`,
      },
    ];
  },

  // Templates moved from /campaigns/templates → /conversations/templates
  // (now nested under Conversations in the sidebar). Redirect old bookmarks
  // and deep links so they don't 404.
  async redirects() {
    return [
      {
        source: '/campaigns/templates',
        destination: '/conversations/templates',
        permanent: false,
      },
      {
        source: '/campaigns/templates/:path*',
        destination: '/conversations/templates/:path*',
        permanent: false,
      },
      // "/landing" is an exact duplicate of "/" (page.tsx renders the same
      // landing component). Redirect it so search engines don't index two URLs
      // for the home page. Nothing internal links to /landing.
      {
        source: '/landing',
        destination: '/',
        permanent: true,
      },
    ];
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
      // Static media in /public (videos, images, fonts) is immutable content  - 
      // let the browser and CDN cache it instead of re-downloading it on every
      // visit. This rule comes after the blanket no-store above and, matching
      // the same Cache-Control key, overrides it for these file types only.
      {
        source:
          "/:path*.:ext(mp4|webm|mov|png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|otf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      // CORS headers for contact form embed
      {
        source: "/api/contact",
        headers: [
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Allow all origins, or restrict to specific domains
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Forwarded-Host, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
          },
        ],
      },
      // CORS headers for embed.js script
      {
        source: "/embed.js",
        headers: [
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Content-Type",
            value: "application/javascript",
          },
        ],
      },
    ];
  },

  // ⚠️ TEMPORARY - not permanent.
  // While this is true, `next build` skips type-checking entirely, which is how
  // two missing-export runtime crashes shipped to users in one day (proxyGet
  // from '@/lib/api'; community-roi's useDataImport). It stays true only because
  // develop currently carries ~363 pre-existing type errors - flipping it now
  // would fail every Docker / Cloud Run build.
  // A report-only `tsc --noEmit` CI gate now surfaces these on every PR
  // (.github/workflows/ci.yml → type-check job). PHASE 2: once that baseline is
  // burned down to 0, DELETE this block and make the CI gate blocking so
  // `next build` enforces types too.
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

  // Environment variables are handled via .env files and process.env
};

// Wrap with Sentry (source-map upload + tunneling) only when @sentry/nextjs is
// installed - keeps `next.config` loading before `npm install @sentry/nextjs`.
// Source-map upload activates only when SENTRY_ORG/PROJECT/AUTH_TOKEN are set.
let exportedConfig = nextConfig;
try {
  const { withSentryConfig } = require('@sentry/nextjs');
  exportedConfig = withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: !process.env.CI,
    disableLogger: true,
    widenClientFileUpload: true,
  });
} catch {
  // @sentry/nextjs not installed yet - ship the plain config.
}

export default exportedConfig;
