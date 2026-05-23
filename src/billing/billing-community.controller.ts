import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { BillingService } from './billing.service';
import { CreateCommunityChargesDto } from './dto/create-community-charges.dto';

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

  /** Assign a bill with due date to one or more residents (shows on mobile as outstanding). */
  @Post('invoices')
  createInvoices(
    @CurrentUser() jwt: JwtPayload,
    @Body() dto: CreateCommunityChargesDto,
  ) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.billing.createChargesForResidents(cid, dto);
  }
}
