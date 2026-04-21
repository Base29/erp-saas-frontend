# --- Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
# Increase memory limit to 2GB and bypass strict tsc check for faster/stable builds on Pi
RUN NODE_OPTIONS="--max-old-space-size=2048" npx vite build

# --- Serve stage ---
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
