# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# If you use native deps like bcrypt/sharp, uncomment the next line
# RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build  # must produce dist/server.js

# ---------- Runtime stage ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# Cloud Run expects your app to listen on $PORT (default 8080)
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/server.js"]
