# Multi-stage build for Next.js production deployment with monorepo workspaces
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files for monorepo workspaces
COPY package*.json ./
COPY web/package*.json ./web/
COPY sdk/package*.json ./sdk/

# Install dependencies using npm workspaces (resolves SDK as workspace package)
RUN npm ci --ignore-scripts

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Verify critical config files are present in build context
RUN test -f /app/web/next.config.mjs && echo "✅ next.config.mjs present" || (echo "❌ next.config.mjs missing" && exit 1)
RUN test -f /app/web/tsconfig.json && echo "✅ tsconfig.json present" || (echo "❌ tsconfig.json missing" && exit 1)

# Build Next.js app from web workspace
WORKDIR /app/web

# Accept build arguments for API URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_ICP_BACKEND_URL
ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_DISABLE_VAPI
ARG NEXT_PUBLIC_WHATSAPP_API_URL
ARG NEXT_PUBLIC_BNI_SERVICE_URL

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-https://lad-backend-develop-160078175457.us-central1.run.app}
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-https://lad-backend-develop-160078175457.us-central1.run.app}
ENV NEXT_PUBLIC_ICP_BACKEND_URL=${NEXT_PUBLIC_ICP_BACKEND_URL:-https://lad-backend-develop-160078175457.us-central1.run.app}
ENV NEXT_PUBLIC_DISABLE_VAPI=${NEXT_PUBLIC_DISABLE_VAPI:-false}
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_WHATSAPP_API_URL=$NEXT_PUBLIC_WHATSAPP_API_URL
ENV NEXT_PUBLIC_BNI_SERVICE_URL=$NEXT_PUBLIC_BNI_SERVICE_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma client if prisma directory exists
RUN if [ -d "prisma" ]; then npx prisma generate; fi

# Verify React Query package resolution
RUN node -e "console.log('RQ:', require.resolve('@tanstack/react-query'))" \
 && node -e "console.log('QC:', require.resolve('@tanstack/query-core'))"

RUN npm run build

# Verify standalone output was generated (fails build if next.config.mjs output:standalone didn't work)
# With outputFileTracingRoot: '..', Next.js places server.js at standalone/web/server.js
RUN test -f .next/standalone/web/server.js && echo "✅ standalone/web/server.js present" || \
    (echo "❌ standalone/web/server.js MISSING — check output:standalone in next.config.mjs" && ls -la .next/standalone/ && exit 1)

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output (with outputFileTracingRoot: '..', Next.js nests under web/)
# This copies standalone/web/server.js → /app/web/server.js
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./

# Copy static assets to web/.next/static (mirrored from standalone structure)
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static

# Copy public directory to web/public
COPY --from=builder --chown=nextjs:nodejs /app/web/public ./web/public

# Verify server.js was copied to the correct location
RUN test -f /app/web/server.js && echo "✅ server.js found at /app/web/server.js" || \
    (echo "❌ server.js not found! Listing /app:" && ls -la /app/ && ls -la /app/web/ 2>/dev/null && exit 1)

# Cloud Run-friendly start script (reads PORT from env, defaults to 8080)
RUN printf '%s\n' \
  '#!/bin/sh' \
  'set -e' \
  'export HOSTNAME="${HOSTNAME:-0.0.0.0}"' \
  'export PORT="${PORT:-8080}"' \
  'echo "Starting Next.js server on ${HOSTNAME}:${PORT}"' \
  'cd /app/web && exec node server.js' \
  > /app/start.sh \
  && chmod +x /app/start.sh \
  && chown nextjs:nodejs /app/start.sh

USER nextjs

# Expose port (Cloud Run uses PORT env variable, typically 8080)
EXPOSE 8080

ENV HOSTNAME="0.0.0.0"

# Start the application via start.sh which cd's to /app/web and runs server.js
CMD ["/app/start.sh"]
