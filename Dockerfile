# Multi-stage build for Next.js production deployment (monorepo-safe)
# Fixes missing native optional deps (lightningcss / tailwindcss-oxide) on Linux by using npm install in web workspace.

FROM node:20-slim AS base

# System deps (Prisma warning + native deps friendliness)
RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# -------------------------
# Builder
# -------------------------
FROM base AS builder
WORKDIR /app

# Build tools needed for native module compilation (node-gyp for lightningcss, etc.)
RUN apt-get update -y \
  && apt-get install -y python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Copy full source
COPY . .

# Install deps in the web workspace so Linux native optional deps are resolved correctly
WORKDIR /app/web

# IMPORTANT:
# - npm ci is lockfile-strict and can miss linux optional deps if lockfile was generated on mac/windows.
# - npm install will resolve the correct platform optional deps and write a linux-correct lock in the container.
# - --foreground-scripts: Ensure npm scripts run even if ignore-scripts was set globally in CI
RUN rm -rf node_modules package-lock.json \
  && npm install --include=optional --foreground-scripts --no-audit --fund=false \
  && npm rebuild

# Fail fast if native bindings are missing (saves time vs failing inside next build)
RUN node -e "require('lightningcss'); console.log('✅ lightningcss ok')" \
  && node -e "require('@tailwindcss/oxide'); console.log('✅ tailwind oxide ok')"

# Build args
ARG VITE_BACKEND_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_ICP_BACKEND_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_DISABLE_VAPI

# Runtime/build envs (Next reads NEXT_PUBLIC_* at build-time)
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL:-https://lad-backend-develop-741719885039.us-central1.run.app}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-https://lad-backend-develop-741719885039.us-central1.run.app}
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-https://lad-backend-develop-741719885039.us-central1.run.app}
ENV NEXT_PUBLIC_ICP_BACKEND_URL=${NEXT_PUBLIC_ICP_BACKEND_URL:-https://lad-backend-develop-741719885039.us-central1.run.app}
ENV NEXT_PUBLIC_DISABLE_VAPI=${NEXT_PUBLIC_DISABLE_VAPI:-false}
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Set NODE_ENV only after install (avoid npm skipping optional/dev during install)
ENV NODE_ENV=production

# Prisma generate (prisma folder is at repo root)
WORKDIR /app
RUN if [ -d "prisma" ]; then npx prisma generate; fi

# Build Next.js app
WORKDIR /app/web
RUN npm run build && \
  echo "✅ Build completed successfully" && \
  ls -la /app/web/.next/standalone/server.js

# -------------------------
# Runner
# -------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

# Copy standalone output (server.js at root)
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./

# Copy static assets to .next/static
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./.next/static

# Copy public directory
COPY --from=builder --chown=nextjs:nodejs /app/web/public ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"


# Start the application
CMD ["node", "server.js"]
