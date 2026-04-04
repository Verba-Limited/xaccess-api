import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Community } from '../communities/entities/community.entity';
import { User } from '../users/entities/user.entity';
import { AccessLog } from '../access/entities/access-log.entity';
import { HardwareDevice } from '../hardware/entities/hardware-device.entity';
import { UsersModule } from '../users/users.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { CommunityAdminsController } from './community-admins.controller';
import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Community, User, AccessLog, HardwareDevice]),
    UsersModule,
  ],
  providers: [AdminService, AdminSubscriptionsService],
  controllers: [
    AdminController,
    CommunityAdminsController,
    AdminSubscriptionsController,
  ],
})
export class AdminModule {}
