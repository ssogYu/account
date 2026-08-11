# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src

RUN npm run build
RUN npm run db:generate

# ---- Production Stage ----
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache tzdata curl
ENV TZ=Asia/Shanghai

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
