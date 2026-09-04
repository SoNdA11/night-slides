FROM node:20-alpine AS builder
WORKDIR /app

# Copy package manifests
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN cd client && npm ci
RUN cd server && npm ci

# Copy source files
COPY client/ ./client/
COPY server/ ./server/

# Build client and server
RUN cd client && npm run build
RUN cd server && npm run build

# Production runtime stage
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

RUN cd server && npm ci --omit=dev

ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000

CMD ["node", "server/dist/index.js"]
