import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateCommunityAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsUUID()
  communityId: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
