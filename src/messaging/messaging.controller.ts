import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { BadRequestException } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller({ path: 'messages', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.RESIDENT)
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get('inbox')
  inbox(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.messaging.listInbox(jwt.sub, cid);
  }

  @Get('sent')
  sent(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.messaging.listSent(jwt.sub, cid);
  }

  @Get(':id')
  one(@CurrentUser() jwt: JwtPayload, @Param('id') id: string) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.messaging.getOne(id, jwt.sub, cid);
  }

  @Post()
  create(@CurrentUser() jwt: JwtPayload, @Body() dto: CreateMessageDto) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.messaging.create(jwt.sub, cid, dto);
  }
}
