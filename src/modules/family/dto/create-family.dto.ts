import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFamilyDto {
  @ApiProperty({ example: '幸福之家', description: '家庭组名称' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}
