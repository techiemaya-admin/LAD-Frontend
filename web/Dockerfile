# Multi-stage build for Next.js production deployment with monorepo workspaces
FROM node:18-alpine AS base

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
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY --from=deps /app/sdk/node_modules ./sdk/node_modules

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

# Verify React Query package resolution
RUN node -e "console.log('RQ:', require.resolve('@tanstack/react-query'))" \
 && node -e "console.log('QC:', require.resolve('@tanstack/query-core'))"

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
