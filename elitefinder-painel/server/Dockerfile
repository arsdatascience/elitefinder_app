# ===== BUILD STAGE =====
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy necessary files for server build
COPY server ./server
COPY shared ./shared
COPY vite.config.server.ts ./
COPY tsconfig.json ./

# Build server only
RUN pnpm run build:server

# ===== PRODUCTION STAGE =====
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod

# Copy built server from builder
COPY --from=builder /app/dist/server ./dist/server

# Copy shared folder if exists
COPY --from=builder /app/shared ./shared

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/ping || exit 1

# Start the server
CMD ["node", "dist/server/node-build.mjs"]
