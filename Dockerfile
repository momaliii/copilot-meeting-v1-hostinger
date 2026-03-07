# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/vite.config.ts ./
COPY --from=builder /app/index.html ./

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["npx", "tsx", "server.ts"]
