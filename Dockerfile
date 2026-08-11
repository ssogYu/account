# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# 先复制 prisma 目录再 npm ci，因为 postinstall 会执行 prisma generate
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

RUN npm run build
# prisma generate 已在 postinstall 中执行，此处跳过

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

# 启动前自动运行数据库迁移，再启动应用
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
