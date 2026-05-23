import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class RecordUtilityConsumptionDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  powerKwh?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  waterM3?: number;
}
