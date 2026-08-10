import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { BillType } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryBillDto {
  @ApiPropertyOptional({ example: 1, description: '页码，默认 1' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: '每页条数，默认 20，最大 100',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ example: 'c103f2a0-...', description: '按分类筛选' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-...',
    description: '按支付账户筛选',
  })
  @IsOptional()
  @IsUUID()
  paymentAccountId?: string;

  @ApiPropertyOptional({
    enum: BillType,
    example: BillType.expense,
    description: '按类型筛选',
  })
  @IsOptional()
  @IsEnum(BillType)
  type?: BillType;

  @ApiPropertyOptional({ example: '2026-07-01', description: '起始日期' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-07-31', description: '结束日期' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: '午餐',
    description: '关键字搜索（匹配备注、分类名）',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-...',
    description: '按家庭成员筛选（仅在家庭组模式下有效）',
  })
  @IsOptional()
  @IsUUID()
  memberId?: string;
}
