import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({ example: '宠物', description: '分类名称' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: '🐱', description: '图标（emoji 或图标名）' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiProperty({
    enum: CategoryType,
    example: CategoryType.expense,
    description: '适用类型',
  })
  @IsEnum(CategoryType)
  type: CategoryType;
}
