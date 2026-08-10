import { Controller, Post, Req } from '@nestjs/common';
import {
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import { User } from '../../common/decorators/user.decorator';
import { UploadService } from './upload.service';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiOperation({
    summary: '通用文件上传',
    description:
      '上传图片文件（jpeg/png/webp/heic，最大 10MB）。' +
      'scene 可选 bill（账单识别图片，默认）或 avatar（用户头像）。' +
      '返回 fileId 和可访问的图片 URL。',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '上传成功，返回文件信息' })
  @ApiResponse({
    status: 400,
    description: '文件缺失、类型不支持或超出大小限制',
  })
  upload(@Req() req: FastifyRequest, @User('userId') userId: string) {
    return this.uploadService.upload(req, userId);
  }
}
