import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingCommunityController } from './billing-community.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice])],
  providers: [BillingService],
  controllers: [BillingController, BillingCommunityController],
})
export class BillingModule {}
