import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(1)
  body: string;

  /** If omitted or null, message goes to estate management */
  @IsOptional()
  @IsUUID()
  recipientId?: string | null;
}
