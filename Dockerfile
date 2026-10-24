# Gerdoo.cloud image for the Joumeh storefront (Vite SPA + Express API, in-memory DB seeded from db/catalog.ts).
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["npx", "tsx", "gerdoo/server.ts"]
