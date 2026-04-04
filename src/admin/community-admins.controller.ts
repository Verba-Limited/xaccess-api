import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateCommunityAdminDto } from './dto/create-community-admin.dto';
import { UpdateCommunityAdminDto } from './dto/update-community-admin.dto';

/**
 * Dedicated controller for `/admin/community-admins` so list/create are
 * registered as distinct handlers (avoids any router ordering ambiguity).
 */
@Controller({ path: 'admin/community-admins', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class CommunityAdminsController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  listCommunityAdmins() {
    return this.adminService.listCommunityAdmins();
  }

  @Post()
  createCommunityAdmin(@Body() dto: CreateCommunityAdminDto) {
    return this.adminService.createCommunityAdmin(dto);
  }

  @Get(':id')
  getCommunityAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getCommunityAdmin(id);
  }

  @Patch(':id')
  updateCommunityAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommunityAdminDto,
  ) {
    return this.adminService.updateCommunityAdmin(id, dto);
  }

  @Delete(':id')
  deleteCommunityAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteCommunityAdmin(id);
  }
}
