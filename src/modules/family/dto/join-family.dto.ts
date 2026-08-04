import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class JoinFamilyDto {
  @ApiProperty({ example: 'A1B2C3D4', description: '8 位家庭邀请码' })
  @IsString()
  @Length(8, 8)
  inviteCode: string;
}
