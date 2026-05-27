import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SendMessageDto {
  @ApiProperty({ description: '用户消息内容', example: '午饭花了25' })
  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class QueryChatDto {
  @ApiPropertyOptional({ description: '获取最近N条消息', default: 50 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({ description: '游标，传入最后一条消息ID实现翻页' })
  @IsString()
  @IsOptional()
  cursor?: string;
}

export class ConfirmBillDto {
  @ApiPropertyOptional({ description: '修改后的分类ID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: '修改后的金额' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: '修改后的备注' })
  @IsString()
  @IsOptional()
  note?: string;

  /** 便捷访问：提取edits */
  get edits() {
    const result: Record<string, unknown> = {};
    if (this.categoryId !== undefined) result.categoryId = this.categoryId;
    if (this.amount !== undefined) result.amount = this.amount;
    if (this.note !== undefined) result.note = this.note;
    return Object.keys(result).length > 0 ? result : undefined;
  }
}
