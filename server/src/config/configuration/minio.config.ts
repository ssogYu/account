import { registerAs } from '@nestjs/config';

export const minioConfig = registerAs('minio', () => ({
  endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
  port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
  accessKey:
    process.env.MINIO_ROOT_USER ?? process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
  secretKey:
    process.env.MINIO_ROOT_PASSWORD ??
    process.env.MINIO_SECRET_KEY ??
    'minioadmin',
  useSSL: process.env.MINIO_USE_SSL === 'true',
  bucket: process.env.MINIO_BUCKET ?? 'account',
  publicUrlPrefix:
    process.env.MINIO_PUBLIC_URL_PREFIX ??
    `http://${process.env.MINIO_ENDPOINT ?? 'localhost'}:${process.env.MINIO_PORT ?? '9000'}`,
}));
