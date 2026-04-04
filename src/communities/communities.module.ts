import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Community } from './entities/community.entity';
import { CommunitiesService } from './communities.service';
import { CommunitiesController } from './communities.controller';
import { PublicCommunitiesController } from './public-communities.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Community])],
  providers: [CommunitiesService],
  controllers: [CommunitiesController, PublicCommunitiesController],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
