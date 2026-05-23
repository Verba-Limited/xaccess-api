import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { UtilitiesService } from './utilities.service';
import { UpdateCommunityUtilityConfigDto } from './dto/update-community-utility-config.dto';
import { RecordUtilityConsumptionDto } from './dto/record-utility-consumption.dto';

@Controller({ path: 'utilities/community', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.COMMUNITY_ADMIN)
export class UtilitiesCommunityController {
  constructor(private readonly utilities: UtilitiesService) {}

  @Get('summary')
  summary(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.utilities.communitySummary(cid);
  }

  @Get('residents')
  residents(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.utilities.communityResidentsUsage(cid);
  }

  /** Facility-wide prepaid utility rules */
  @Get('config')
  getConfig(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.utilities.getCommunityUtilityConfig(cid);
  }

  @Patch('config')
  patchConfig(
    @CurrentUser() jwt: JwtPayload,
    @Body() dto: UpdateCommunityUtilityConfigDto,
  ) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.utilities.updateCommunityUtilityConfig(cid, dto);
  }

  /** Record consumption against a resident's prepaid quota (e.g. from smart meters) */
  @Post('residents/:residentId/consumption')
  recordConsumption(
    @CurrentUser() jwt: JwtPayload,
    @Param('residentId') residentId: string,
    @Body() dto: RecordUtilityConsumptionDto,
  ) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.utilities.recordResidentConsumption(cid, residentId, dto);
  }
}