import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

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

  @ApiPropertyOptional({ description: '用户选择的支付账户 ID（覆盖 AI 提取值）' })
  @IsOptional()
  @IsUUID()
  paymentAccountId?: string;
}
