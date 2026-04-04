import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { CredentialType } from '../../access/entities/access-log.entity';

export class ValidateCredentialDto {
  @IsString()
  @MinLength(16)
  deviceApiKey: string;

  @IsEnum(CredentialType)
  credentialType: CredentialType;

  /** Raw token string (QR), or token for PASSWORD mode, or RFID UID */
  @IsString()
  @MinLength(1)
  value: string;

  @IsOptional()
  @IsString()
  keypadPassword?: string;
}
