import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: '分类名称', example: '餐饮' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: '分类类型',
    enum: ['expense', 'income'],
    example: 'expense',
  })
  @IsString()
  @IsIn(['expense', 'income'])
  type!: string;

  @ApiProperty({ description: '图标', example: '🍜' })
  @IsString()
  @IsNotEmpty()
  icon!: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: '分类名称' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '图标' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  icon?: string;
}

export class QueryCategoryDto {
  @ApiPropertyOptional({
    description: '分类类型筛选',
    enum: ['expense', 'income'],
  })
  @IsString()
  @IsIn(['expense', 'income'])
  @IsOptional()
  type?: string;
}
