import {
  IsString,
  IsOptional,
  MinLength,
  IsEmail,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @ValidateIf((o) => !o.email)
  @IsString()
  phone?: string;

  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  nickname?: string;
}

export class LoginDto {
  @ValidateIf((o) => !o.email)
  @IsString()
  phone?: string;

  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @IsString()
  password!: string;
}
