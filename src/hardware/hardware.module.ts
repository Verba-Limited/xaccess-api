import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HardwareDevice } from './entities/hardware-device.entity';
import { RfidCard } from '../access/entities/rfid-card.entity';
import { User } from '../users/entities/user.entity';
import { HardwareDevicesService } from './hardware-devices.service';
import { HardwareValidationService } from './hardware-validation.service';
import { HardwareController } from './hardware.controller';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [
    AccessModule,
    TypeOrmModule.forFeature([HardwareDevice, RfidCard, User]),
  ],
  providers: [HardwareDevicesService, HardwareValidationService],
  controllers: [HardwareController],
  exports: [HardwareDevicesService],
})
export class HardwareModule {}
