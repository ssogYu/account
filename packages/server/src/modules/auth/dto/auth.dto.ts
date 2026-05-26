import {
  IsString,
  IsOptional,
  MinLength,
  IsEmail,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiPropertyOptional({ description: '手机号，与邮箱二选一' })
  @ValidateIf((o) => !o.email)
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '邮箱，与手机号二选一' })
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @ApiProperty({ description: '密码，最少6位' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ description: '昵称' })
  @IsOptional()
  @IsString()
  nickname?: string;
}

export class LoginDto {
  @ApiPropertyOptional({ description: '手机号' })
  @ValidateIf((o) => !o.email)
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '邮箱' })
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  password!: string;
}
