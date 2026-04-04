import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateIncidentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
