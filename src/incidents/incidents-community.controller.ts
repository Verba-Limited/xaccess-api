import { BadRequestException, Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { IncidentsService } from './incidents.service';

@Controller({ path: 'incidents/community', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.COMMUNITY_ADMIN)
export class IncidentsCommunityController {
  constructor(private readonly incidents: IncidentsService) {}

  @Get()
  list(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.incidents.listForCommunityAdmin(cid);
  }
}
