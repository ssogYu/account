import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateBillDto {
  @ApiPropertyOptional({ example: 38.0, description: '金额' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(9999999999.99)
  amount?: number;

  @ApiPropertyOptional({
    enum: BillType,
    example: BillType.expense,
    description: '账单类型',
  })
  @IsOptional()
  @IsEnum(BillType)
  type?: BillType;

  @ApiPropertyOptional({ example: 'c103f2a0-...', description: '分类 ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-...', description: '支付账户 ID' })
  @IsOptional()
  @IsUUID()
  paymentAccountId?: string;

  @ApiPropertyOptional({ example: '午餐+饮料', description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @ApiPropertyOptional({
    example: '2026-07-30T12:00:00.000Z',
    description: '账单发生日期',
  })
  @IsOptional()
  @IsDateString()
  billDate?: string;
}
