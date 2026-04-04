import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessTokensService } from './access-tokens.service';
import { CreateAccessTokenDto } from './dto/create-access-token.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { AccessLogAction } from './entities/access-log.entity';

@Controller({ path: 'access/tokens', version: '1' })
@UseGuards(AuthGuard('jwt'))
export class AccessTokensController {
  constructor(private readonly accessTokensService: AccessTokensService) {}

  @Post()
  create(@CurrentUser() jwt: JwtPayload, @Body() dto: CreateAccessTokenDto) {
    return this.accessTokensService.create(jwt, dto);
  }

  @Get()
  list(@CurrentUser() jwt: JwtPayload) {
    return this.accessTokensService.listMine(jwt);
  }

  /** Facility admin: all access tokens generated in this community (history). */
  @Get('community')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMMUNITY_ADMIN)
  listCommunity(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.accessTokensService.listForCommunityAdmin(cid);
  }

  @Get('community/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMMUNITY_ADMIN)
  oneCommunity(@CurrentUser() jwt: JwtPayload, @Param('id') id: string) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.accessTokensService.getOneForCommunityAdmin(cid, id);
  }

  @Post('community/:id/check-in')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMMUNITY_ADMIN)
  facilityCheckIn(@CurrentUser() jwt: JwtPayload, @Param('id') id: string) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.accessTokensService.manualFacilityLog(
      cid,
      id,
      jwt.sub,
      AccessLogAction.ENTRY,
    );
  }

  @Post('community/:id/check-out')
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMMUNITY_ADMIN)
  facilityCheckOut(@CurrentUser() jwt: JwtPayload, @Param('id') id: string) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.accessTokensService.manualFacilityLog(
      cid,
      id,
      jwt.sub,
      AccessLogAction.EXIT,
    );
  }

  @Post(':id/revoke')
  revoke(@CurrentUser() jwt: JwtPayload, @Param('id') id: string) {
    return this.accessTokensService.revoke(jwt, id);
  }
}
