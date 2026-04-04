import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { AdminSubscriptionsService } from './admin-subscriptions.service';

@Controller({ path: 'admin/subscriptions', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminSubscriptionsController {
  constructor(private readonly subscriptions: AdminSubscriptionsService) {}

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.subscriptions.getOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptions.update(id, dto);
  }
}
