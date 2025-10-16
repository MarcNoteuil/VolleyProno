# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=optional
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build || (echo "Skipping build if scripts not present" && true)

# ---- Runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY backend/package*.json ./
EXPOSE 4000
CMD ["node", "dist/server.js"]
