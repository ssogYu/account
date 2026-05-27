import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  IsIn,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBillDto {
  @ApiProperty({
    description: '账单类型',
    enum: ['expense', 'income'],
    example: 'expense',
  })
  @IsString()
  @IsIn(['expense', 'income'])
  type!: string;

  @ApiProperty({ description: '金额', example: 25.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: '分类ID', example: 'clxxx...' })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @ApiPropertyOptional({ description: '备注', example: '午饭' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: '账户', example: '微信' })
  @IsString()
  @IsOptional()
  account?: string;

  @ApiPropertyOptional({ description: '日期', example: '2025-01-15' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({
    description: '来源',
    enum: ['manual', 'ai'],
    default: 'manual',
  })
  @IsString()
  @IsIn(['manual', 'ai'])
  @IsOptional()
  source?: string;
}

export class UpdateBillDto {
  @ApiPropertyOptional({ description: '账单类型', enum: ['expense', 'income'] })
  @IsString()
  @IsIn(['expense', 'income'])
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: '金额' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: '分类ID' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: '账户' })
  @IsString()
  @IsOptional()
  account?: string;

  @ApiPropertyOptional({ description: '日期' })
  @IsDateString()
  @IsOptional()
  date?: string;
}

export class QueryBillDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: '账单类型筛选',
    enum: ['expense', 'income'],
  })
  @IsString()
  @IsIn(['expense', 'income'])
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: '分类ID筛选' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: '开始日期', example: '2025-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2025-01-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: '年月筛选，格式 YYYY-MM',
    example: '2025-01',
  })
  @IsString()
  @IsOptional()
  month?: string;
}
