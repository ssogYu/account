import { defineConfig } from 'prisma/config';

// 优先读环境变量，否则用兜底值
const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://common:common123@localhost:5432/account?schema=public&timezone=Asia%2FShanghai';

const shadowDatabaseUrl =
  process.env.SHADOW_DATABASE_URL ||
  'postgresql://common:common123@localhost:5432/common_shadow?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
    shadowDatabaseUrl: shadowDatabaseUrl,
  },
});
