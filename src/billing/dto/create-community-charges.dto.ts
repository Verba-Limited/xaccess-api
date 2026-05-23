import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  IsUUID,
} from 'class-validator';

/** Facility admin: one bill (same title/amount/due) applied to each selected resident. */
export class CreateCommunityChargesDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(100)
  /** Minor units (e.g. kobo). Minimum ₦1.00. */
  amountMinor!: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(8)
  currency?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dueDate must be YYYY-MM-DD',
  })
  dueDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  residentIds!: string[];
}
