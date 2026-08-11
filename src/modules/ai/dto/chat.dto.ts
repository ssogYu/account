import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class ChatDto {
  @ApiProperty({ description: '用户输入的自然语言文本', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ description: '对话 ID，不传则自动创建新对话' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({
    description: '账单图片 URL 列表（先通过 POST /upload 上传获取 fileId/url）',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true, message: 'imageUrls 每项必须是合法的 URL' })
  imageUrls?: string[];
}
