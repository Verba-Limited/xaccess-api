import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommunitiesService } from './communities.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { UpdateCommunityStatusDto } from './dto/update-community-status.dto';

@Controller({ path: 'communities', version: '1' })
@UseGuards(AuthGuard('jwt'))
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateCommunityDto) {
    return this.communitiesService.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  list() {
    return this.communitiesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMMUNITY_ADMIN)
  @UseGuards(RolesGuard)
  async getOne(@Param('id') id: string, @CurrentUser() jwt: JwtPayload) {
    const c = await this.communitiesService.findById(id);
    if (
      jwt.role === UserRole.COMMUNITY_ADMIN &&
      jwt.communityId !== id
    ) {
      throw new ForbiddenException();
    }
    return c;
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  updateStatus(@Param('id') id: string, @Body() body: UpdateCommunityStatusDto) {
    return this.communitiesService.setActive(id, body.isActive);
  }

  @Get(':id/dashboard')
  @Roles(UserRole.COMMUNITY_ADMIN)
  @UseGuards(RolesGuard)
  async dashboard(@Param('id') id: string, @CurrentUser() jwt: JwtPayload) {
    if (jwt.communityId !== id) {
      throw new ForbiddenException();
    }
    const c = await this.communitiesService.findById(id);
    return {
      community: c,
      message: 'Extend with access metrics and resident counts from services',
    };
  }
}
