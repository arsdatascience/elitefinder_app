# ===== BUILD STAGE (Backend) =====
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files (Root)
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build server
RUN pnpm run build:server

# ===== RUN STAGE =====
FROM node:20-alpine

WORKDIR /app

# Copy package.json for potential runtime references
COPY --from=builder /app/package.json ./

# Copy node_modules (Required because express, pg, etc are externalized)
COPY --from=builder /app/node_modules ./node_modules

# Copy built server artifacts
COPY --from=builder /app/dist ./dist

# Start the server
CMD ["node", "dist/server/node-build.mjs"]
