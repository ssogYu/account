import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Client } from 'minio';
import { PinoLogger } from 'nestjs-pino';

import { storageConfig } from '../../config/configuration/storage.config';

export interface UploadFileInput {
  /** 文件内容 */
  buffer: Buffer;
  /** 存储对象名（含目录前缀，如 bill/xxx.png） */
  objectName: string;
  /** MIME 类型 */
  mimetype: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private client: Client;

  constructor(
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('StorageService');
  }

  async onModuleInit() {
    const { endpoint, port, useSsl, region, accessKey, secretKey } =
      this.config;

    this.client = new Client({
      endPoint: endpoint,
      port,
      useSSL: useSsl,
      region,
      accessKey,
      secretKey,
    });

    await this.ensureBucket();
  }

  /** 确保 bucket 存在并设为公开读（便于前端直接访问图片 URL） */
  private async ensureBucket() {
    const { bucket } = this.config;
    try {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket);
        this.logger.info({ bucket }, 'MinIO bucket 已创建');

        // 仅新建 bucket 时设置公开读策略，避免每次启动重复调用
        const policy = JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        });
        await this.client.setBucketPolicy(bucket, policy);
        this.logger.info({ bucket }, 'MinIO bucket 公开读策略已就绪');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      this.logger.error(
        { bucket, error: message },
        'MinIO bucket 初始化失败，文件上传功能不可用',
      );
    }
  }

  /** 上传文件到 MinIO，返回对象名与可访问 URL */
  async uploadFile({ buffer, objectName, mimetype }: UploadFileInput) {
    const { bucket } = this.config;
    await this.client.putObject(bucket, objectName, buffer, buffer.length, {
      'Content-Type': mimetype,
    });
    this.logger.info({ objectName, size: buffer.length }, '文件上传成功');
    return { objectName, url: this.getFileUrl(objectName) };
  }

  /** 删除文件 */
  async deleteFile(objectName: string) {
    const { bucket } = this.config;
    await this.client.removeObject(bucket, objectName);
    this.logger.info({ objectName }, '文件删除成功');
  }

  /** 构建文件公网访问 URL */
  getFileUrl(objectName: string) {
    return `${this.config.publicUrl.replace(/\/$/, '')}/${this.config.bucket}/${objectName}`;
  }

  getStatus() {
    return {
      provider: this.config.provider,
      configured: Boolean(this.config.accessKey),
      endpoint: this.config.endpoint,
      port: this.config.port,
      bucket: this.config.bucket,
    };
  }
}
