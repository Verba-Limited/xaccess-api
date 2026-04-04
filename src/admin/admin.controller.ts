import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller({ path: 'admin', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('analytics/summary')
  summary() {
    return this.adminService.platformSummary();
  }
}
