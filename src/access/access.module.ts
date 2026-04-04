import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessToken } from './entities/access-token.entity';
import { AccessLog } from './entities/access-log.entity';
import { RfidCard } from './entities/rfid-card.entity';
import { AccessTokensService } from './access-tokens.service';
import { AccessTokensController } from './access-tokens.controller';
import { AccessLogsController } from './access-logs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AccessToken, AccessLog, RfidCard])],
  providers: [AccessTokensService],
  controllers: [AccessTokensController, AccessLogsController],
  exports: [AccessTokensService, TypeOrmModule],
})
export class AccessModule {}
