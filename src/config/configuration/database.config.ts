import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  provider: process.env.DB_PROVIDER ?? 'postgresql',
  url: process.env.DATABASE_URL ?? '',
  directUrl: process.env.DATABASE_DIRECT_URL ?? '',
  schema: process.env.DATABASE_SCHEMA ?? 'public',
}));
