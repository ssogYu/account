import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: '张三',
    minLength: 2,
    maxLength: 50,
    description: '新用户名',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: '用户名至少 2 个字符' })
  @MaxLength(50, { message: '用户名最多 50 个字符' })
  username?: string;

  @ApiPropertyOptional({
    example: 'http://127.0.0.1:9000/common-dev/avatar/2026/08/xxx.png',
    description: '头像图片 URL（由 /upload 接口返回的 url）',
  })
  @IsOptional()
  @IsString()
  avatar?: string;
}
