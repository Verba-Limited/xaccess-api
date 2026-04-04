import { IsBoolean } from 'class-validator';

export class UpdateCommunityStatusDto {
  @IsBoolean()
  isActive: boolean;
}
