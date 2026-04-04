import { IsEnum, IsString, MinLength } from 'class-validator';
import { HardwareDeviceType } from '../entities/hardware-device.entity';

export class RegisterDeviceDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(HardwareDeviceType)
  type: HardwareDeviceType;
}
