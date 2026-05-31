import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { ResponseMessage } from '../../common/decorators';
import { MinioService } from './minio.service';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

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
    if (!file) {
      throw new BadRequestException('请选择要上传的图片');
    }

    // 二次校验：通过魔数验证真实文件类型，防止 MIME 伪造
    if (!validateMagicNumber(file.buffer, file.mimetype)) {
      throw new BadRequestException('文件内容与声明类型不匹配');
    }

    // 从 MIME 推断扩展名，不信任 originalname
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

    const objectName = `avatars/${randomUUID()}${ext}`;
    await this.minioService.upload(objectName, file.buffer, file.mimetype);
    const url = this.minioService.getPublicUrl(objectName);

    return { url };
  }
}
