import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class ConfirmDto {
  @ApiProperty({ description: '会话 ID（chat 接口返回）' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: '确认（true）或取消（false）创建账单' })
  @IsBoolean()
  confirm: boolean;

  @ApiPropertyOptional({ description: '用户选择的分类 ID（覆盖 AI 提取值）' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: '用户选择的支付账户 ID（覆盖 AI 提取值）',
  })
  @IsOptional()
  @IsUUID()
  paymentAccountId?: string;

  @ApiPropertyOptional({ description: '用户编辑后的金额（覆盖 AI 提取值）' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({
    description: '用户编辑后的日期 YYYY-MM-DD（覆盖 AI 提取值）',
  })
  @IsOptional()
  @IsString()
  billDate?: string;

  @ApiPropertyOptional({
    description: '用户编辑后的类型 expense/income（覆盖 AI 提取值）',
  })
  @IsOptional()
  @IsString()
  type?: string;
}
