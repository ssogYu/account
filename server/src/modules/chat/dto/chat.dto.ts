import {
  ArrayMaxSize,
  IsArray,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsInt,
  ValidateNested,
  IsObject,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ChatAttachmentDto {
  @ApiProperty({ description: '附件类型', example: 'image' })
  @IsString()
  @IsIn(['image'])
  type!: 'image';

  @ApiProperty({ description: '存储桶标识', example: 'private' })
  @IsString()
  @IsIn(['private'])
  bucket!: 'private';

  @ApiProperty({ description: '对象存储 key' })
  @IsString()
  @IsNotEmpty()
  objectKey!: string;

  @ApiProperty({ description: '文件 MIME 类型', example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiPropertyOptional({ description: '原始文件名' })
  @IsString()
  @IsOptional()
  fileName?: string;

  @ApiPropertyOptional({ description: '文件大小（字节）' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @ApiPropertyOptional({ description: '图片宽度' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({ description: '图片高度' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  height?: number;
}

export class SendMessageDto {
  @ApiPropertyOptional({ description: '用户消息内容', example: '午饭花了25' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: '聊天附件列表',
    type: [ChatAttachmentDto],
  })
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  @IsOptional()
  attachments?: ChatAttachmentDto[];
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
  @ApiProperty({ description: '确认第几笔账单（从0开始）' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  billIndex!: number;

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

  @ApiPropertyOptional({ description: '修改后的账户名称' })
  @IsString()
  @IsOptional()
  accountName?: string;

  get edits() {
    const result: Record<string, unknown> = {};
    if (this.categoryId !== undefined) result.categoryId = this.categoryId;
    if (this.amount !== undefined) result.amount = this.amount;
    if (this.note !== undefined) result.note = this.note;
    if (this.accountName !== undefined) result.accountName = this.accountName;
    return Object.keys(result).length > 0 ? result : undefined;
  }
}

export class BillEditDto {
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

  @ApiPropertyOptional({ description: '修改后的账户名称' })
  @IsString()
  @IsOptional()
  accountName?: string;
}

export class ConfirmAllBillsDto {
  @ApiPropertyOptional({
    description: '每笔账单的编辑内容，key为账单索引（从0开始）',
    example: { '0': { accountName: '微信' }, '1': { amount: 20 } },
  })
  @IsObject()
  @IsOptional()
  edits?: Record<string, BillEditDto>;
}
