import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { UtilitiesService } from './utilities.service';
import { UpdateUtilityPreferencesDto } from './dto/update-utility-preferences.dto';

@Controller({ path: 'utilities', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.RESIDENT)
export class UtilitiesController {
  constructor(private readonly utilities: UtilitiesService) {}

  @Get('usage')
  usage(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.utilities.seriesForUser(jwt.sub, cid);
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
}
