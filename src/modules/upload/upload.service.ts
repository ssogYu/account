import { createHash } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';
import * as path from 'node:path';

import { StorageService } from '../../infra/storage/storage.service';
import { DbService } from '../../infra/db/db.service';

/** 上传场景，决定文件存放目录 */
export type UploadScene = 'bill' | 'avatar';

const UPLOAD_SCENES: ReadonlySet<string> = new Set<UploadScene>([
  'bill',
  'avatar',
]);

/** 各场景允许的 MIME 类型 */
const SCENE_MIME_ALLOWLIST: Record<UploadScene, string[]> = {
  bill: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  avatar: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
};

/** 扩展名 → MIME 白名单（防止伪装上传可执行文件） */
const MIME_EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
};

@Injectable()
export class UploadService {
  constructor(
    private readonly storageService: StorageService,
    private readonly db: DbService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('UploadService');
  }

  /**
   * 通用文件上传：解析 multipart，校验后写入 MinIO，返回文件信息。
   */
  async upload(req: FastifyRequest, userId: string) {
    const parts = req.parts();
    let fileBuffer: Buffer | null = null;
    let filename = '';
    let mimetype = '';
    let scene: UploadScene = 'bill';

    for await (const part of parts) {
      if (part.type === 'file') {
        fileBuffer = await part.toBuffer();
        filename = part.filename || '';
        mimetype = part.mimetype || '';
      } else if (
        part.fieldname === 'scene' &&
        typeof part.value === 'string' &&
        part.value.length > 0
      ) {
        if (!UPLOAD_SCENES.has(part.value)) {
          throw new BadRequestException('不支持的上传场景');
        }
        scene = part.value as UploadScene;
      }
    }

    if (!fileBuffer) {
      throw new BadRequestException('未接收到上传文件');
    }

    this.validateFile({ buffer: fileBuffer, mimetype, filename, scene });

    // 计算内容指纹（sha256），用于跨会话去重
    const contentHash = createHash('sha256').update(fileBuffer).digest('hex');

    // 账单图片去重：同一用户上传同一张图片时直接复用已存对象，不再重复存储
    if (scene === 'bill') {
      const existing = await this.findExistingAttachment(userId, contentHash);

      if (existing) {
        this.logger.info(
          { userId, contentHash, objectName: existing.objectName },
          '账单图片命中重复，复用已存对象',
        );
        return {
          fileId: existing.objectName,
          url: existing.url,
          filename,
          size: fileBuffer.length,
          mimetype,
          scene,
          duplicated: true,
        };
      }
    }

    const objectName = this.buildObjectName({ scene, mimetype, userId });
    const { objectName: storedName, url } =
      await this.storageService.uploadFile({
        buffer: fileBuffer,
        objectName,
        mimetype,
      });

    // 账单图片落指纹记录，供后续跨会话去重
    if (scene === 'bill') {
      await this.saveAttachment(userId, contentHash, storedName, url);
    }

    this.logger.info(
      { userId, scene, objectName: storedName, size: fileBuffer.length },
      '通用文件上传成功',
    );

    return {
      fileId: storedName,
      url,
      filename,
      size: fileBuffer.length,
      mimetype,
      scene,
      duplicated: false,
    };
  }

  /**
   * 查找已存在的账单图片指纹记录。
   * 表未就绪或查询异常时降级为 null（不查重、直接上传），保证上传功能不受去重影响。
   */
  private async findExistingAttachment(userId: string, contentHash: string) {
    try {
      return await this.db.billAttachment.findUnique({
        where: { userId_contentHash: { userId, contentHash } },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知错误';
      this.logger.warn(
        { userId, contentHash, error: message },
        '账单图片去重查询失败，跳过查重',
      );
      return null;
    }
  }

  /**
   * 保存账单图片指纹记录。
   * 写入失败仅记录日志，不影响上传结果（去重能力降级，上传仍成功）。
   */
  private async saveAttachment(
    userId: string,
    contentHash: string,
    objectName: string,
    url: string,
  ) {
    try {
      await this.db.billAttachment.create({
        data: { userId, contentHash, objectName, url },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知错误';
      this.logger.warn(
        { userId, contentHash, objectName, error: message },
        '账单图片指纹记录写入失败，去重能力降级',
      );
    }
  }

  /** 校验文件类型、大小、扩展名 */
  private validateFile(input: {
    buffer: Buffer;
    mimetype: string;
    filename: string;
    scene: UploadScene;
  }) {
    const { buffer, mimetype, filename, scene } = input;

    if (buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException('文件大小不能超过 10MB');
    }

    const allowlist = SCENE_MIME_ALLOWLIST[scene];
    if (!allowlist.includes(mimetype)) {
      throw new BadRequestException('文件类型不支持，仅允许图片文件');
    }

    const ext = path.extname(filename || '').toLowerCase();
    const allowedExt = MIME_EXT_MAP[mimetype];
    if (allowedExt && ext && ext !== allowedExt) {
      throw new BadRequestException('文件扩展名与内容类型不一致');
    }
  }

  /** 生成对象名：{scene}/{yyyy}/{mm}/{uuid}{ext} */
  private buildObjectName(input: {
    scene: UploadScene;
    mimetype: string;
    userId: string;
  }) {
    const { scene, mimetype, userId } = input;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const ext = MIME_EXT_MAP[mimetype] ?? '';
    const id = `${Date.now()}-${userId.slice(0, 8)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    return `${scene}/${year}/${month}/${id}${ext}`;
  }
}
