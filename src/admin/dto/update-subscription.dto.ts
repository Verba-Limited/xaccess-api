import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  adminName?: string;

  @IsOptional()
  @IsString()
  facility?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
