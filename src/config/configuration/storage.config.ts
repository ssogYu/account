import { registerAs } from '@nestjs/config';

import { parseBoolean, parseNumber } from './helpers';

export const storageConfig = registerAs('storage', () => ({
  provider: process.env.STORAGE_PROVIDER ?? 'minio',
  endpoint: process.env.STORAGE_ENDPOINT ?? '127.0.0.1',
  port: parseNumber(process.env.STORAGE_PORT, 9000),
  useSsl: parseBoolean(process.env.STORAGE_USE_SSL, false),
  bucket: process.env.STORAGE_BUCKET ?? 'common-dev',
  accessKey: process.env.STORAGE_ACCESS_KEY ?? '',
  secretKey: process.env.STORAGE_SECRET_KEY ?? '',
}));
