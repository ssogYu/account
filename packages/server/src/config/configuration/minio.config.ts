import { registerAs } from '@nestjs/config';

export const minioConfig = registerAs('minio', () => ({
  endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
  port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
  accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  useSSL: process.env.MINIO_USE_SSL === 'true',
  bucket: process.env.MINIO_BUCKET ?? 'account',
}));
