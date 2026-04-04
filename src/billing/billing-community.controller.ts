import { BadRequestException, Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { BillingService } from './billing.service';

@Controller({ path: 'billing/community', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.COMMUNITY_ADMIN)
export class BillingCommunityController {
  constructor(private readonly billing: BillingService) {}

  @Get('invoices')
  list(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.billing.listForCommunityAdmin(cid);
  }
}
