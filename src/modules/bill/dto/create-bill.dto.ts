import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BillType } from '@prisma/client';

export class CreateBillDto {
  @ApiProperty({ example: 35.0, description: '金额' })
  @IsNumber()
  @Min(0.01)
  @Max(9999999999.99)
  amount: number;

  @ApiProperty({
    enum: BillType,
    example: BillType.expense,
    description: '账单类型',
  })
  @IsEnum(BillType)
  type: BillType;

  @ApiProperty({ example: 'c103f2a0-...', description: '分类 ID' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-...', description: '支付账户 ID' })
  @IsOptional()
  @IsUUID()
  paymentAccountId?: string;

  @ApiPropertyOptional({ example: '午餐', description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @ApiPropertyOptional({
    example: '2026-07-30T12:00:00.000Z',
    description: '账单发生日期，默认当天',
  })
  @IsOptional()
  @IsDateString()
  billDate?: string;
}
