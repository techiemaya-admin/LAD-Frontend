# Multi-stage build for Next.js production deployment

FROM node:20-slim AS base

# System deps (Prisma/OpenSSL + TLS). Keep this in base so builder/runner have it.
RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# -------------------------
# deps: install node_modules in a linux environment
# -------------------------
FROM base AS deps

# Build tools only needed for native modules (node-gyp)
RUN apt-get update -y \
  && apt-get install -y python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files for web and sdk
COPY web/package*.json ./web/
COPY sdk/package*.json ./sdk/

# IMPORTANT:
# - Use npm install (not npm ci) so linux optional/platform deps (lightningcss/oxide) can be resolved.
# - Force scripts ON in case CI sets ignore-scripts=true.
RUN set -eux; \
  npm config set ignore-scripts false; \
  npm config set optional true; \
  cd web; \
  rm -rf node_modules package-lock.json; \
  npm install --include=optional --no-audit --fund=false --foreground-scripts; \
  node -e "require('lightningcss'); console.log('✅ lightningcss ok (deps)')"; \
  node -e "require('@tailwindcss/oxide'); console.log('✅ tailwind oxide ok (deps)')"; \
  cd /app; \
  ( cd sdk && rm -rf node_modules package-lock.json && npm install --include=optional --no-audit --fund=false --foreground-scripts ) \
    || mkdir -p /app/sdk/node_modules

# -------------------------
# builder: compile Next.js
# -------------------------
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY --from=deps /app/sdk/node_modules ./sdk/node_modules

# Copy source code
COPY web ./web
COPY sdk ./sdk
# If prisma exists at repo root, you must copy it too; otherwise prisma generate won't find schema.
# (This line is safe even if prisma/ doesn't exist if you add it to your repo; Docker COPY fails if missing.)
COPY prisma ./prisma

WORKDIR /app/web

# Accept build arguments for API URL
ARG VITE_BACKEND_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_ICP_BACKEND_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_DISABLE_VAPI

ENV VITE_BACKEND_URL=${VITE_BACKEND_URL:-https://lad-backend-develop-741719885039.us-central1.run.app}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-https://lad-backend-develop-741719885039.us-central1.run.app}
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-https://lad-backend-develop-741719885039.us-central1.run.app}
ENV NEXT_PUBLIC_ICP_BACKEND_URL=${NEXT_PUBLIC_ICP_BACKEND_URL:-https://lad-backend-develop-741719885039.us-central1.run.app}
ENV NEXT_PUBLIC_DISABLE_VAPI=${NEXT_PUBLIC_DISABLE_VAPI:-false}
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Set NODE_ENV after deps are installed (we're not installing here, but keep it sane)
ENV NODE_ENV=production

# Generate Prisma client if prisma directory exists
# NOTE: this runs from /app/web currently, so we switch to /app to match prisma/ location.
WORKDIR /app
RUN if [ -d "prisma" ]; then npx prisma generate; fi

# Build Next.js app
WORKDIR /app/web
RUN NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL} \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE:-${NEXT_PUBLIC_BACKEND_URL}} \
    NEXT_PUBLIC_ICP_BACKEND_URL=${NEXT_PUBLIC_ICP_BACKEND_URL} \
    NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL} \
    NEXT_PUBLIC_DISABLE_VAPI=${NEXT_PUBLIC_DISABLE_VAPI} \
    npm run build

# -------------------------
# runner: minimal runtime
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

CMD ["node", "server.js"]
