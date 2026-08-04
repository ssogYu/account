import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateFamilyDto {
  @ApiProperty({ example: '快乐一家', description: '家庭组新名称' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}
