import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UtilityUsage } from './entities/utility-usage.entity';
import { UtilityPreference } from './entities/utility-preference.entity';
import { CommunityUtilityConfig } from './entities/community-utility-config.entity';
import { ResidentUtilityCycle } from './entities/resident-utility-cycle.entity';
import { UtilityPaystackPayment } from './entities/utility-paystack-payment.entity';
import { User } from '../users/entities/user.entity';
import { UtilitiesService } from './utilities.service';
import { UtilitiesSubscriptionService } from './utilities-subscription.service';
import { PaystackApiService } from './paystack-api.service';
import { UtilityPaystackService } from './utility-paystack.service';
import { UtilitiesController } from './utilities.controller';
import { UtilitiesCommunityController } from './utilities-community.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UtilityUsage,
      UtilityPreference,
      CommunityUtilityConfig,
      ResidentUtilityCycle,
      UtilityPaystackPayment,
      User,
    ]),
  ],
  providers: [
    UtilitiesService,
    UtilitiesSubscriptionService,
    PaystackApiService,
    UtilityPaystackService,
  ],
  controllers: [UtilitiesController, UtilitiesCommunityController],
})
export class UtilitiesModule {}
