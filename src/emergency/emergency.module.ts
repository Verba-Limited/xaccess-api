import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmergencyContact } from './entities/emergency-contact.entity';
import { EmergencyContactsService } from './emergency-contacts.service';
import { PublicEmergencyController } from './public-emergency.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EmergencyContact])],
  providers: [EmergencyContactsService],
  controllers: [PublicEmergencyController],
  exports: [EmergencyContactsService],
})
export class EmergencyModule {}
