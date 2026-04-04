import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
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
import { PayInvoiceDto } from './dto/pay-invoice.dto';

@Controller({ path: 'billing', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.RESIDENT)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('summary')
  summary(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.billing.summary(jwt.sub, cid);
  }

  @Get('invoices')
  list(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.billing.listForUser(jwt.sub, cid);
  }

  @Get('invoices/:id')
  async one(@CurrentUser() jwt: JwtPayload, @Param('id') id: string) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    const inv = await this.billing.getOne(id, jwt.sub, cid);
    if (!inv) throw new NotFoundException();
    return inv;
  }

  /** Record payment for an outstanding invoice (resident; integrates with card / Paystack flows). */
  @Post('invoices/:id/pay')
  async pay(
    @CurrentUser() jwt: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PayInvoiceDto,
  ) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.billing.recordPayment(id, jwt.sub, cid, dto.paymentMethod);
  }
}
