import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  /** Join an existing community by id */
  @IsOptional()
  @IsUUID()
  communityId?: string;
}
