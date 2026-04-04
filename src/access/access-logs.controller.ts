import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessTokensService } from './access-tokens.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { UserRole } from '../users/entities/user.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ForbiddenException } from '@nestjs/common';

@Controller({ path: 'access/logs', version: '1' })
@UseGuards(AuthGuard('jwt'))
export class AccessLogsController {
  constructor(private readonly accessTokensService: AccessTokensService) {}

  @Get('me')
  async myLogs(@CurrentUser() jwt: JwtPayload) {
    if (jwt.role !== UserRole.RESIDENT) {
      throw new ForbiddenException();
    }
    return this.accessTokensService.listLogsForResident(jwt.sub);
  }

  @Get('community')
  @Roles(UserRole.COMMUNITY_ADMIN)
  @UseGuards(RolesGuard)
  async communityLogs(@CurrentUser() jwt: JwtPayload) {
    if (!jwt.communityId) return [];
    return this.accessTokensService.listLogsForCommunity(jwt.communityId);
  }
}
