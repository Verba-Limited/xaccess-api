import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { UpdateResidentStatusDto } from './dto/update-resident-status.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { CommunitiesService } from '../communities/communities.service';

@Controller({ path: 'users', version: '1' })
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly communitiesService: CommunitiesService,
  ) {}

  @Patch('me')
  async updateMe(@CurrentUser() jwt: JwtPayload, @Body() dto: UpdateMeDto) {
    const user = await this.usersService.updateProfile(jwt.sub, dto);
    return this.usersService.toPublic(user);
  }

  @Get('profile')
  async profile(@CurrentUser() jwt: JwtPayload) {
    const user = await this.usersService.findByIdOrFail(jwt.sub);
    return this.usersService.toPublic(user);
  }

  /** Active residents in your community (directory). Residents exclude self. */
  @Get('community/directory')
  @Roles(UserRole.RESIDENT, UserRole.COMMUNITY_ADMIN)
  @UseGuards(RolesGuard)
  async neighborDirectory(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) {
      return [];
    }
    const exclude =
      jwt.role === UserRole.RESIDENT ? jwt.sub : undefined;
    return this.usersService.listNeighborDirectory(cid, exclude);
  }

  /** Estate name + primary administrator contact */
  @Get('community/context')
  @Roles(UserRole.RESIDENT, UserRole.COMMUNITY_ADMIN)
  @UseGuards(RolesGuard)
  async communityContext(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) {
      return { community: null, administrator: null };
    }
    const community = await this.communitiesService.findById(cid);
    const admin = await this.usersService.findFirstActiveCommunityAdmin(cid);
    return {
      community: {
        id: community.id,
        name: community.name,
        slug: community.slug,
      },
      administrator: admin
        ? {
            fullName: admin.fullName,
            phone: admin.phone,
            email: admin.email,
          }
        : null,
    };
  }

  /** Community admin: list residents in their community */
  @Get('residents')
  @Roles(UserRole.COMMUNITY_ADMIN)
  @UseGuards(RolesGuard)
  async residents(@CurrentUser() jwt: JwtPayload) {
    if (!jwt.communityId) {
      return [];
    }
    const list = await this.usersService.listResidentsInCommunity(
      jwt.communityId,
    );
    return list.map((u) => this.usersService.toPublic(u));
  }

  /** Community admin: enable/disable a resident in their community */
  @Patch('residents/:id/status')
  @Roles(UserRole.COMMUNITY_ADMIN)
  @UseGuards(RolesGuard)
  async residentsStatus(
    @CurrentUser() jwt: JwtPayload,
    @Param('id') id: string,
    @Body() body: UpdateResidentStatusDto,
  ) {
    const target = await this.usersService.findByIdOrFail(id);
    if (target.communityId !== jwt.communityId || target.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Not allowed for this user');
    }
    const ok = await this.usersService.setActive(id, body.isActive);
    return this.usersService.toPublic(ok);
  }
}
