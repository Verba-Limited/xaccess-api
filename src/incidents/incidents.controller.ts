import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { BadRequestException } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';

@Controller({ path: 'incidents', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.RESIDENT)
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @Post()
  create(@CurrentUser() jwt: JwtPayload, @Body() dto: CreateIncidentDto) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.incidents.create(dto, jwt.sub, cid);
  }

  @Get('me')
  mine(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.incidents.listMine(jwt.sub, cid);
  }
}
