# Multi-stage build for Next.js production deployment
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files for web and sdk
COPY web/package*.json ./web/
COPY sdk/package*.json ./sdk/

# Install dependencies
RUN cd web && npm ci && \
    (cd ../sdk && npm ci || mkdir -p ../sdk/node_modules)

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/web/node_modules ./web/node_modules

# Copy source code
COPY web ./web
COPY sdk ./sdk

# Build Next.js app
WORKDIR /app/web

# Accept build arguments for API URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_ICP_BACKEND_URL
ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_DISABLE_VAPI

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-https://lad-backend-develop-741719885039.us-central1.run.app}
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-https://lad-backend-develop-741719885039.us-central1.run.app}
ENV NEXT_PUBLIC_ICP_BACKEND_URL=${NEXT_PUBLIC_ICP_BACKEND_URL:-https://lad-backend-develop-741719885039.us-central1.run.app}
ENV NEXT_PUBLIC_DISABLE_VAPI=${NEXT_PUBLIC_DISABLE_VAPI:-false}
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma client if prisma directory exists
RUN if [ -d "prisma" ]; then npx prisma generate; fi

RUN npm run build

# Production image, copy all the files and run next
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

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
