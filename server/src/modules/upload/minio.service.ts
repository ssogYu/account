import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import * as Minio from 'minio';
import { minioConfig } from '../../config/configuration/minio.config';

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;
  private readonly config: ConfigType<typeof minioConfig>;
  private readonly logger = new Logger(MinioService.name);

  constructor(
    @Inject(minioConfig.KEY)
    config: ConfigType<typeof minioConfig>,
  ) {
    this.config = config;
    this.client = new Minio.Client({
      endPoint: config.endPoint,
      port: config.port,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      useSSL: config.useSSL,
    });
  }

  async onModuleInit() {
    try {
      await this.ensureBucket(this.config.bucket, true);
      await this.ensureBucket(this.config.privateBucket, false);
    } catch (error) {
      this.logger.error(
        `Failed to initialize MinIO bucket: ${error instanceof Error ? error.message : error}`,
      );
      // 不抛出异常，允许应用启动，上传接口会在运行时报错
    }
  }

  async upload(
    objectName: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    return this.uploadToBucket(
      this.config.bucket,
      objectName,
      buffer,
      contentType,
    );
  }

  async uploadPrivate(
    objectName: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    return this.uploadToBucket(
      this.config.privateBucket,
      objectName,
      buffer,
      contentType,
    );
  }

  async uploadToBucket(
    bucket: string,
    objectName: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const metadata = { 'Content-Type': contentType };
    await this.client.putObject(
      bucket,
      objectName,
      buffer,
      undefined,
      metadata,
    );
    return objectName;
  }

  /** 生成可直接访问的 URL */
  getPublicUrl(objectName: string): string {
    return `${this.config.publicUrlPrefix}/${this.config.bucket}/${objectName}`;
  }

  async getSignedUrl(
    objectName: string,
    options?: { bucket?: string; expiresIn?: number },
  ): Promise<string> {
    const bucket = options?.bucket ?? this.config.privateBucket;
    const internalUrl = await this.client.presignedGetObject(
      bucket,
      objectName,
      options?.expiresIn ?? this.config.signedUrlExpiresIn,
    );

    // 将内部 MinIO 地址替换为公共可访问的地址
    // 例如: http://minio:9000/account-private/xxx?X-Amz-... → https://account.tankswift.top/minio/account-private/xxx?X-Amz-...
    const internal = new URL(internalUrl);
    const publicUrl = `${this.config.publicUrlPrefix}${internal.pathname}${internal.search}`;

    if (publicUrl === internalUrl) {
      this.logger.warn(
        `Signed URL still uses internal address, check MINIO_PUBLIC_URL_PREFIX config`,
      );
    }

    return publicUrl;
  }

  async getObjectBuffer(
    objectName: string,
    options?: { bucket?: string },
  ): Promise<Buffer> {
    const stream = await this.client.getObject(
      options?.bucket ?? this.config.privateBucket,
      objectName,
    );

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });

    return Buffer.concat(chunks);
  }

  private async ensureBucket(bucket: string, isPublic: boolean) {
    const exists = await this.client.bucketExists(bucket);
    if (!exists) {
      await this.client.makeBucket(bucket);
    }

    if (isPublic) {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      };
      await this.client.setBucketPolicy(bucket, JSON.stringify(policy));
    }

    this.logger.log(
      `MinIO bucket "${bucket}" is ready${isPublic ? ' (public read)' : ' (private)'}`,
    );
  }
}
