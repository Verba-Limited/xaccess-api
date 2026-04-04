import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

const PERIODS = ['Monthly', 'Quarterly', 'Annual'] as const;

export class UpdateUtilityPreferencesDto {
  @IsOptional()
  @IsString()
  @IsIn(PERIODS)
  periodLabel?: (typeof PERIODS)[number];

  @IsOptional()
  @IsBoolean()
  waterControlOn?: boolean;

  @IsOptional()
  @IsBoolean()
  powerControlOn?: boolean;
}
