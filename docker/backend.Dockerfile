# ---- Runtime stage ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL="mysql://volleyprono:volleyprono@mysql:3306/volleyprono"
ENV JWT_SECRET="votre-secret-jwt-super-securise-changez-moi"
ENV JWT_REFRESH_SECRET="votre-refresh-secret-jwt-super-securise-changez-moi"
ENV PORT=4000
ENV FRONTEND_URL=http://localhost:5173
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
