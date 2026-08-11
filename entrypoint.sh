#!/bin/sh
set -e

# 为 Prisma CLI 构造完整的 DATABASE_URL（它不会做变量展开）
export DATABASE_URL="postgresql://${POSTGRES_USER:-account}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-account}?schema=public&timezone=Asia%2FShanghai"

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec node dist/main.js
