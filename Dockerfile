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

# Copy necessary files from standalone build
# Standalone output is in .next/standalone and contains server.js at root
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/web/public ./web/public

USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application - server.js is at root of standalone output
CMD ["node", "server.js"]
