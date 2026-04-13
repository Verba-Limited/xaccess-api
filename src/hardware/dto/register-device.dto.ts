import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { HardwareDeviceType } from '../entities/hardware-device.entity';

export class RegisterDeviceDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(HardwareDeviceType)
  type: HardwareDeviceType;

  /**
   * The device's serial number (SN) as printed on the hardware.
   * When provided, the device will be automatically matched when it connects
   * via the WebSocket SDK protocol (port 7788).
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  serialNumber?: string;
}
