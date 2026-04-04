import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CommunitiesModule } from './communities/communities.module';
import { AccessModule } from './access/access.module';
import { HardwareModule } from './hardware/hardware.module';
import { AdminModule } from './admin/admin.module';
import { EmergencyModule } from './emergency/emergency.module';
import { MessagingModule } from './messaging/messaging.module';
import { BillingModule } from './billing/billing.module';
import { UtilitiesModule } from './utilities/utilities.module';
import { IncidentsModule } from './incidents/incidents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    CommunitiesModule,
    AccessModule,
    HardwareModule,
    AdminModule,
    EmergencyModule,
    MessagingModule,
    BillingModule,
    UtilitiesModule,
    IncidentsModule,
  ],
})
export class AppModule {}
