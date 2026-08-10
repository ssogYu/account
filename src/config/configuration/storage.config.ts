import { registerAs } from '@nestjs/config';

import { parseBoolean, parseNumber } from './helpers';

export const storageConfig = registerAs('storage', () => ({
  provider: process.env.STORAGE_PROVIDER ?? 'minio',
  endpoint: process.env.STORAGE_ENDPOINT ?? '127.0.0.1',
  port: parseNumber(process.env.STORAGE_PORT, 9000),
  useSsl: parseBoolean(process.env.STORAGE_USE_SSL, false),
  region: process.env.STORAGE_REGION ?? 'us-east-1',
  bucket: process.env.STORAGE_BUCKET ?? 'common-dev',
  // 公网可访问的存储地址（构建文件 URL 用，默认指向 MinIO 控制台端点）
  publicUrl: process.env.STORAGE_PUBLIC_URL ?? 'http://127.0.0.1:9000',
  accessKey: process.env.STORAGE_ACCESS_KEY ?? '',
  secretKey: process.env.STORAGE_SECRET_KEY ?? '',
}));
