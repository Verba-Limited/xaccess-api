import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UtilityUsage } from './entities/utility-usage.entity';
import { UtilityPreference } from './entities/utility-preference.entity';
import { UtilitiesService } from './utilities.service';
import { UtilitiesController } from './utilities.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UtilityUsage, UtilityPreference])],
  providers: [UtilitiesService],
  controllers: [UtilitiesController],
})
export class UtilitiesModule {}
