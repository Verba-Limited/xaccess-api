import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class JoinCommunityDto {
  /** Join by community UUID (from your estate manager) */
  @IsOptional()
  @IsUUID()
  communityId?: string;

  /** Join by community slug (e.g. harmony-estate) */
  @IsOptional()
  @IsString()
  @MinLength(2)
  slug?: string;
}
