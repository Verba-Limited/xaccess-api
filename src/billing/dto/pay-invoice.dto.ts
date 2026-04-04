import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PayInvoiceDto {
  /** e.g. CARD, PAYSTACK */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  paymentMethod?: string;
}
