import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Incident } from './entities/incident.entity';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
import { IncidentsCommunityController } from './incidents-community.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Incident])],
  providers: [IncidentsService],
  controllers: [IncidentsController, IncidentsCommunityController],
})
export class IncidentsModule {}
