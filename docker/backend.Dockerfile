# ---- Runtime stage ----
FROM node:20-slim AS runner
WORKDIR /app
# Les variables d'environnement doivent être passées via docker-compose ou .env
# Ne JAMAIS hardcoder de secrets ici
ENV NODE_ENV=production
ENV PORT=4000
ENV FFVB_BASE_URL=https://www.ffvb.org
# L'image Puppeteer a déjà toutes les dépendances système nécessaires

COPY backend/package*.json ./
RUN npm ci --omit=optional
RUN npm install ts-node-dev --save-dev
RUN npm install -g ts-node-dev
COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY backend/prisma ./prisma
RUN npx prisma generate
EXPOSE 4000
CMD ["npm", "run", "dev"]
