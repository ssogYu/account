import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({ description: '账户名称', example: '微信' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: '图标标识', example: 'wechat' })
  @IsString()
  @IsNotEmpty()
  icon!: string;
}

export class UpdateAccountDto {
  @ApiPropertyOptional({ description: '账户名称' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '图标标识' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  icon?: string;
}
