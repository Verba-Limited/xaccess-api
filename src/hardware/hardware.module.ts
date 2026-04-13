import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HardwareDevice } from './entities/hardware-device.entity';
import { DeviceUser } from './entities/device-user.entity';
import { RfidCard } from '../access/entities/rfid-card.entity';
import { User } from '../users/entities/user.entity';
import { HardwareDevicesService } from './hardware-devices.service';
import { HardwareValidationService } from './hardware-validation.service';
import { DeviceSocketService } from './device-socket.service';
import { HardwareController } from './hardware.controller';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [
    forwardRef(() => AccessModule),
    TypeOrmModule.forFeature([HardwareDevice, DeviceUser, RfidCard, User]),
  ],
  providers: [HardwareDevicesService, HardwareValidationService, DeviceSocketService],
  controllers: [HardwareController],
  exports: [HardwareDevicesService, DeviceSocketService],
})
export class HardwareModule {}
