import { defineConfig } from 'prisma/config';

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://common:common123@localhost:5432/common?schema=public';

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
