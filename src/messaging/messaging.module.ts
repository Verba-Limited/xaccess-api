import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { MessagingService } from './messaging.service';
import { CommunityMessagesController } from './community-messages.controller';
import { MessagingController } from './messaging.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Message]), UsersModule],
  providers: [MessagingService],
  controllers: [MessagingController, CommunityMessagesController],
})
export class MessagingModule {}
