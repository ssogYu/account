import {
  Body,
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { ResponseMessage } from '../../common/decorators';
import { MinioService } from './minio.service';
import { CurrentUser } from '../auth/decorators';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const CHAT_IMAGE_MAX_SIZE = 8 * 1024 * 1024; // 8MB

class UploadChatImageDto {
  width?: number;
  height?: number;
}

/** 通过文件头魔数验证真实文件类型 */
function validateMagicNumber(buffer: Buffer, mimetype: string): boolean {
  if (buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (mimetype === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (mimetype === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  // WebP: RIFF....WEBP
  if (mimetype === 'image/webp') {
    return (
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }
  return false;
}

@Controller('upload')
export class UploadController {
  constructor(private readonly minioService: MinioService) {}

  private validateAndInferExtension(file: Express.Multer.File): string {
    if (!file) {
      throw new BadRequestException('请选择要上传的图片');
    }

    if (!validateMagicNumber(file.buffer, file.mimetype)) {
      throw new BadRequestException('文件内容与声明类型不匹配');
    }

    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext =
      extMap[file.mimetype] ?? extname(file.originalname).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException('不支持的文件扩展名');
    }

    return ext;
  }

  @Post('image')
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
          cb(new Error('仅支持 JPG/PNG/WebP 格式'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传图片' })
  @ApiResponse({ status: 200, description: '上传成功，返回图片 URL' })
  @ResponseMessage('上传成功')
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const ext = this.validateAndInferExtension(file);

    const objectName = `avatars/${randomUUID()}${ext}`;
    await this.minioService.upload(objectName, file.buffer, file.mimetype);
    const url = this.minioService.getPublicUrl(objectName);

    return { url };
  }

  @Post('chat-image')
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: CHAT_IMAGE_MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
          cb(new Error('仅支持 JPG/PNG/WebP 格式'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        width: { type: 'number' },
        height: { type: 'number' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: '上传首页对话账单图片' })
  @ApiResponse({ status: 200, description: '上传成功，返回聊天附件信息' })
  @ResponseMessage('上传成功')
  async uploadChatImage(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadChatImageDto,
  ) {
    const ext = this.validateAndInferExtension(file);
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const objectKey = `chat-bills/${user.id}/${year}/${month}/${randomUUID()}${ext}`;

    await this.minioService.uploadPrivate(
      objectKey,
      file.buffer,
      file.mimetype,
    );
    const previewUrl = await this.minioService.getSignedUrl(objectKey);

    return {
      attachment: {
        type: 'image',
        bucket: 'private',
        objectKey,
        mimeType: file.mimetype,
        fileName: file.originalname,
        fileSize: file.size,
        width: body.width ? Number(body.width) : undefined,
        height: body.height ? Number(body.height) : undefined,
        previewUrl,
      },
    };
  }
}
