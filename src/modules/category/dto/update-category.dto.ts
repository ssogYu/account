import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CategoryType } from '@prisma/client';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: '宠物用品', description: '分类名称' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: '🐶', description: '图标' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    enum: CategoryType,
    example: CategoryType.expense,
    description: '适用类型',
  })
  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;
}
