import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePaymentAccountDto {
  @ApiProperty({ example: '招商银行', description: '账户名称' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: '🏦', description: '图标' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ example: 5000.0, description: '账户余额' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  balance?: number;
}
