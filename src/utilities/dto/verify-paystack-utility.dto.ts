import { IsString, MinLength } from 'class-validator';

export class VerifyPaystackUtilityDto {
  @IsString()
  @MinLength(8)
  reference!: string;
}
