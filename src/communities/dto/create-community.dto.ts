import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCommunityDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  slug: string;

  @IsOptional()
  @IsString()
  address?: string;
}
