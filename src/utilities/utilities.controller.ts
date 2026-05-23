import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { UtilitiesService, type UtilityPeriod } from './utilities.service';
import { UpdateUtilityPreferencesDto } from './dto/update-utility-preferences.dto';
import { VerifyPaystackUtilityDto } from './dto/verify-paystack-utility.dto';

const PERIODS: UtilityPeriod[] = ['Monthly', 'Quarterly', 'Annual'];

@Controller({ path: 'utilities', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.RESIDENT)
export class UtilitiesController {
  constructor(private readonly utilities: UtilitiesService) {}

  /**
   * Full usage report (chart points + totals). Optional `period` overrides saved preference.
   */
  @Get('usage')
  usage(
    @CurrentUser() jwt: JwtPayload,
    @Query('period') period?: string,
  ) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    const override =
      period && PERIODS.includes(period as UtilityPeriod)
        ? (period as UtilityPeriod)
        : null;
    return this.utilities.getUsageReport(jwt.sub, cid, override);
  }

  @Get('preferences')
  preferences(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.utilities.getPreferences(jwt.sub, cid);
  }

  @Patch('preferences')
  patchPreferences(
    @CurrentUser() jwt: JwtPayload,
    @Body() dto: UpdateUtilityPreferencesDto,
  ) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.utilities.patchPreferences(jwt.sub, cid, dto);
  }

  /** Prepaid utility window + remaining quota */
  @Get('subscription')
  mySubscription(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.utilities.getMySubscription(jwt.sub, cid);
  }

  /**
   * Pay the facility service charge for the current period (demo: no card processor).
   * Resets used kWh/m³ and applies configured quotas.
   */
  @Post('subscription/pay')
  paySubscription(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.utilities.payMyUtilitySubscription(jwt.sub, cid);
  }

  /** Start Paystack checkout (NGN only). Requires PAYSTACK_SECRET_KEY on the server. */
  @Post('subscription/paystack/initialize')
  initializePaystack(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.utilities.initializeUtilityPaystack(jwt.sub, cid);
  }

  /** After Paystack success, confirm and unlock the utility period (idempotent). */
  @Post('subscription/paystack/verify')
  verifyPaystack(
    @CurrentUser() jwt: JwtPayload,
    @Body() dto: VerifyPaystackUtilityDto,
  ) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.utilities.verifyUtilityPaystack(jwt.sub, cid, dto.reference);
  }
}
