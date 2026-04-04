import { IsBoolean } from 'class-validator';

export class UpdateResidentStatusDto {
  @IsBoolean()
  isActive: boolean;
}
