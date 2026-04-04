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
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { MessagingService } from './messaging.service';
import { CreateMessageDto } from './dto/create-message.dto';

/** Facility admin (COMMUNITY_ADMIN): same message model as mobile residents, scoped to their community. */
@Controller({ path: 'users/community/messages', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.COMMUNITY_ADMIN)
export class CommunityMessagesController {
  constructor(private readonly messaging: MessagingService) {}

  @Get('inbox')
  inbox(@CurrentUser() jwt: JwtPayload) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.messaging.listEstateInbox(cid, jwt.sub);
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
    return this.messaging.getOneForCommunityAdmin(id, cid, jwt.sub);
  }

  @Post()
  create(@CurrentUser() jwt: JwtPayload, @Body() dto: CreateMessageDto) {
    const cid = jwt.communityId;
    if (!cid) throw new BadRequestException('Join a community first');
    return this.messaging.create(jwt.sub, cid, dto);
  }
}
