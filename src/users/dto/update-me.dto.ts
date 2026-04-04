import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  /** Estate unit / block display, e.g. "Block 10, Flat 12" */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  unitLabel?: string | null;
}
