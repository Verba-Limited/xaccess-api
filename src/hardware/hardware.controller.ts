import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HardwareDevicesService } from './hardware-devices.service';
import { HardwareValidationService } from './hardware-validation.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { ValidateCredentialDto } from './dto/validate-credential.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { UserRole } from '../users/entities/user.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ForbiddenException } from '@nestjs/common';

@Controller({ path: 'hardware', version: '1' })
export class HardwareController {
  constructor(
    private readonly devices: HardwareDevicesService,
    private readonly validation: HardwareValidationService,
  ) {}

  @Post('devices')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.COMMUNITY_ADMIN)
  registerDevice(
    @CurrentUser() jwt: JwtPayload,
    @Body() dto: RegisterDeviceDto,
  ) {
    if (!jwt.communityId) {
      throw new ForbiddenException('No community assigned');
    }
    return this.devices.register(jwt.communityId, dto);
  }

  @Get('devices')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.COMMUNITY_ADMIN)
  listDevices(@CurrentUser() jwt: JwtPayload) {
    if (!jwt.communityId) return [];
    return this.devices.listByCommunity(jwt.communityId);
  }

  /** Real-time validation from physical hardware (no user JWT) */
  @Post('validate')
  validate(@Body() dto: ValidateCredentialDto) {
    return this.validation.validate(dto);
  }
}
