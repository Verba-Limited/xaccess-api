import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const PERIODS = ['DAY', 'WEEK', 'MONTH', 'YEAR'] as const;

export class UpdateCommunityUtilityConfigDto {
  @IsOptional()
  @IsString()
  @IsIn(PERIODS)
  measurementPeriod?: (typeof PERIODS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  /** Minor units should be whole numbers; HTML number inputs often send floats. */
  serviceChargeMinor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  includedPowerKwh?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  includedWaterM3?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
