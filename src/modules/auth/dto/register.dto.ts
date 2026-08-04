import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({ example: 'zhangsan', minLength: 2, maxLength: 50 })
  @IsString()
  @MinLength(2, { message: '用户名至少 2 个字符' })
  @MaxLength(50, { message: '用户名最多 50 个字符' })
  username: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 50 })
  @IsString()
  @MinLength(6, { message: '密码至少 6 个字符' })
  @MaxLength(50, { message: '密码最多 50 个字符' })
  password: string;
}
