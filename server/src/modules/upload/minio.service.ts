import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import * as Minio from 'minio';
import { minioConfig } from '../../config/configuration/minio.config';

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;
  private readonly bucket: string;
  private readonly config: ConfigType<typeof minioConfig>;
  private readonly logger = new Logger(MinioService.name);

  constructor(
    @Inject(minioConfig.KEY)
    config: ConfigType<typeof minioConfig>,
  ) {
    this.config = config;
    this.bucket = config.bucket;
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
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        // 设置桶策略为公开只读，允许直接通过 URL 访问图片
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        };
        await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
        this.logger.log(
          `MinIO bucket "${this.bucket}" created with public read policy`,
        );
      }
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
    const metadata = { 'Content-Type': contentType };
    await this.client.putObject(
      this.bucket,
      objectName,
      buffer,
      undefined,
      metadata,
    );
    return objectName;
  }

  /** 生成可直接访问的 URL */
  getPublicUrl(objectName: string): string {
    return `${this.config.publicUrlPrefix}/${this.bucket}/${objectName}`;
  }
}
