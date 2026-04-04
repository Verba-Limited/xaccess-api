import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateCommunityAdminDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsUUID()
  communityId?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
