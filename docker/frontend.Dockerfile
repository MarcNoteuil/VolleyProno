# ---- Build stage ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV ROLLUP_SKIP_NODEJS_NATIVE=1
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/tsconfig*.json ./
COPY frontend/vite.config.ts ./
COPY frontend/index.html ./
COPY frontend/postcss.config.js ./
COPY frontend/tailwind.config.ts ./
COPY frontend/src ./src
COPY frontend/public ./public
RUN npm run build

# ---- Runtime stage ----
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=builder /app/dist .
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
