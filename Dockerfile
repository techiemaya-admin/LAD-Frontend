# Multi-stage build for Next.js production deployment (monorepo-safe)

FROM node:20-slim AS base

RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# -------------------------
# Builder
# -------------------------
FROM base AS builder
WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Copy only package files first for better caching
COPY package*.json ./
COPY web/package*.json ./web/
COPY sdk/package*.json ./sdk/

WORKDIR /app/web

# Install dependencies (keep package-lock.json for reproducible builds)
RUN rm -rf node_modules \
  && npm install --include=optional --foreground-scripts --no-audit --fund=false

# Force-install native linux bindings (deterministic)
RUN npm install --no-save --no-audit --fund=false \
    lightningcss-linux-x64-gnu \
    @tailwindcss/oxide-linux-x64-gnu || true

# Ensure lightningcss binding exists where lightningcss expects it
RUN if [ ! -f node_modules/lightningcss/lightningcss.linux-x64-gnu.node ]; then \
      echo "⚠️ lightningcss binding missing; searching..."; \
      f="$(find node_modules -maxdepth 6 -name 'lightningcss.linux-x64-*.node' | head -n 1 || true)"; \
      echo "Found: $f"; \
      if [ -n "$f" ]; then cp "$f" node_modules/lightningcss/lightningcss.linux-x64-gnu.node; fi; \
    fi

# Fail fast checks
RUN node -e "require('lightningcss'); console.log('✅ lightningcss ok')" \
 && node -e "require('@tailwindcss/oxide'); console.log('✅ tailwind oxide ok')"

# Copy source code after deps are installed (back to /app root for correct structure)
WORKDIR /app
COPY . .

# Verify critical config files are present in build context
RUN test -f /app/web/next.config.mjs && echo "✅ next.config.mjs present" || (echo "❌ next.config.mjs missing" && exit 1)
RUN test -f /app/web/tsconfig.json && echo "✅ tsconfig.json present" || (echo "❌ tsconfig.json missing" && exit 1)

WORKDIR /app/web

# Verify React Query package resolution
RUN node -e "console.log('RQ:', require.resolve('@tanstack/react-query'))" \
 && node -e "console.log('QC:', require.resolve('@tanstack/query-core'))"

# Build args - these MUST be provided via --build-arg in cloudbuild
ARG VITE_BACKEND_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_ICP_BACKEND_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_DISABLE_VAPI

# Set environment variables from build args
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV NEXT_PUBLIC_ICP_BACKEND_URL=${NEXT_PUBLIC_ICP_BACKEND_URL}
ENV NEXT_PUBLIC_DISABLE_VAPI=${NEXT_PUBLIC_DISABLE_VAPI:-false}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
ENV NEXT_TELEMETRY_DISABLED=1
# NODE_ENV=production enables Next.js optimizations (minification, tree-shaking)
# This should be 'production' for ALL environments (dev/stage/prod)
ENV NODE_ENV=production

WORKDIR /app
RUN if [ -d "prisma" ]; then npx prisma generate; fi

# Verify React Query package resolution
WORKDIR /app/web
RUN node -e "console.log('RQ:', require.resolve('@tanstack/react-query'))" \
 && node -e "console.log('QC:', require.resolve('@tanstack/query-core'))"

WORKDIR /app/web
RUN npm run build && \
  echo "✅ Build completed successfully" && \
  test -f /app/web/.next/standalone/server.js && echo "✅ server.js found" || echo "⚠️ server.js not found, checking .next structure" && ls -la /app/web/.next/standalone/ 2>/dev/null | head -20 || echo "⚠️ .next/standalone dir may not exist"

# -------------------------
# Runner
# -------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# IMPORTANT: do NOT set PORT here — Cloud Run provides it (often 8080)
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

# Copy standalone server and dependencies (monorepo nested under web/)
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone/web ./
# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./.next/static
# Copy public directory
COPY --from=builder --chown=nextjs:nodejs /app/web/public ./public

# Verify server.js exists before running
RUN test -f server.js || (echo "ERROR: server.js not found!" && ls -la && exit 1)

# Cloud Run-friendly start script: always bind HOSTNAME and PORT
RUN printf '%s\n' \
  '#!/bin/sh' \
  'set -e' \
  'export HOSTNAME="${HOSTNAME:-0.0.0.0}"' \
  'export PORT="${PORT:-8080}"' \
  'if [ -f /app/server.js ]; then' \
  '  echo "Starting /app/server.js on ${HOSTNAME}:${PORT}"' \
  '  exec node /app/server.js' \
  'elif [ -f /app/web/server.js ]; then' \
  '  echo "Starting /app/web/server.js on ${HOSTNAME}:${PORT}"' \
  '  exec node /app/web/server.js' \
  'else' \
  '  echo "ERROR: No server.js found in /app or /app/web"' \
  '  ls -la /app || true' \
  '  ls -la /app/web || true' \
  '  exit 1' \
  'fi' \
  > /app/start.sh \
  && chmod +x /app/start.sh \
  && chown nextjs:nodejs /app/start.sh

USER nextjs
EXPOSE 3000

CMD ["/app/start.sh"]
