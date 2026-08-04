import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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
}
