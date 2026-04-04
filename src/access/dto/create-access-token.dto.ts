import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccessTokenType } from '../entities/access-token.entity';

class AccessMethodsDto {
  @IsBoolean()
  qr: boolean;

  @IsBoolean()
  password: boolean;

  @IsBoolean()
  rfid: boolean;
}

export class CreateAccessTokenDto {
  @IsEnum(AccessTokenType)
  type: AccessTokenType;

  @ValidateNested()
  @Type(() => AccessMethodsDto)
  methods: AccessMethodsDto;

  @IsOptional()
  @IsString()
  @MinLength(1)
  guestName?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  /** Required if methods.password is true */
  @IsOptional()
  @IsString()
  @MinLength(4)
  keypadPassword?: string;
}
