import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import type { DataSourceOptions } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Community } from '../communities/entities/community.entity';
import { AccessToken } from '../access/entities/access-token.entity';
import { AccessLog } from '../access/entities/access-log.entity';
import { RfidCard } from '../access/entities/rfid-card.entity';
import { HardwareDevice } from '../hardware/entities/hardware-device.entity';
import { EmergencyContact } from '../emergency/entities/emergency-contact.entity';
import { Message } from '../messaging/entities/message.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { UtilityUsage } from '../utilities/entities/utility-usage.entity';
import { UtilityPreference } from '../utilities/entities/utility-preference.entity';
import { Incident } from '../incidents/entities/incident.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): DataSourceOptions => {
        const entities = [
          User,
          Community,
          AccessToken,
          AccessLog,
          RfidCard,
          HardwareDevice,
          EmergencyContact,
          Message,
          Invoice,
          UtilityUsage,
          UtilityPreference,
          Incident,
        ];

        const databaseUrl = config.get<string>('DATABASE_URL');

        if (databaseUrl) {
          // PostgreSQL — Railway / Render / any cloud Postgres
          return {
            type: 'postgres',
            url: databaseUrl,
            entities,
            synchronize: true,
            logging: false,
            ssl: databaseUrl.includes('localhost')
              ? false
              : { rejectUnauthorized: false },
          } as DataSourceOptions;
        }

        // SQLite — local development
        const database = config.get<string>('DATABASE_PATH', './data/xaccess.sqlite');
        mkdirSync(dirname(database), { recursive: true });
        return {
          type: 'better-sqlite3',
          database,
          entities,
          synchronize: true,
          logging: false,
        } as DataSourceOptions;
      },
    }),
    TypeOrmModule.forFeature([
      Community,
      User,
      EmergencyContact,
      Invoice,
      UtilityUsage,
    ]),
  ],
  providers: [SeedService],
})
export class DatabaseModule {}
