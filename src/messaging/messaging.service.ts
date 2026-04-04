import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

function toRow(m: Message) {
  const createdAt =
    m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt);
  return {
    id: m.id,
    subject: m.subject,
    body: m.body,
    senderId: m.senderId,
    recipientId: m.recipientId,
    readAt: m.readAt,
    createdAt,
    senderName: m.sender?.fullName ?? null,
    recipientName: m.recipient?.fullName ?? null,
  };
}

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(Message)
    private readonly repo: Repository<Message>,
    private readonly usersService: UsersService,
  ) {}

  async listInbox(userId: string, communityId: string): Promise<ReturnType<typeof toRow>[]> {
    const list = await this.repo.find({
      where: { communityId, recipientId: userId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
    return list.map(toRow);
  }

  async listSent(userId: string, communityId: string): Promise<ReturnType<typeof toRow>[]> {
    const list = await this.repo.find({
      where: { communityId, senderId: userId },
      relations: ['recipient'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
    return list.map(toRow);
  }

  /**
   * Inbox for community admins: messages to estate management (recipientId null)
   * or addressed directly to this admin.
   */
  async listEstateInbox(
    communityId: string,
    adminUserId: string,
  ): Promise<ReturnType<typeof toRow>[]> {
    const list = await this.repo.find({
      where: [
        { communityId, recipientId: IsNull() },
        { communityId, recipientId: adminUserId },
      ],
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
    return list.map(toRow);
  }

  async getOneForCommunityAdmin(
    id: string,
    communityId: string,
    adminUserId: string,
  ): Promise<ReturnType<typeof toRow>> {
    const m = await this.repo.findOne({
      where: { id, communityId },
      relations: ['sender', 'recipient'],
    });
    if (!m) throw new NotFoundException('Message not found');
    const canView =
      m.senderId === adminUserId ||
      m.recipientId === adminUserId ||
      m.recipientId === null;
    if (!canView) throw new ForbiddenException();
    if (m.recipientId === adminUserId && !m.readAt) {
      m.readAt = new Date();
      await this.repo.save(m);
    }
    return toRow(m);
  }

  async getOne(id: string, userId: string, communityId: string): Promise<ReturnType<typeof toRow>> {
    const m = await this.repo.findOne({
      where: { id, communityId },
      relations: ['sender', 'recipient'],
    });
    if (!m) throw new NotFoundException('Message not found');
    if (m.senderId !== userId && m.recipientId !== userId) {
      throw new ForbiddenException();
    }
    if (m.recipientId === userId && !m.readAt) {
      m.readAt = new Date();
      await this.repo.save(m);
    }
    return toRow(m);
  }

  async create(
    senderId: string,
    communityId: string,
    dto: CreateMessageDto,
  ): Promise<ReturnType<typeof toRow>> {
    let recipientId: string | null = dto.recipientId ?? null;
    if (recipientId) {
      const other = await this.usersService.findByIdOrFail(recipientId);
      if (other.communityId !== communityId || other.role !== UserRole.RESIDENT) {
        throw new BadRequestException('Invalid recipient');
      }
    }
    const m = this.repo.create({
      communityId,
      senderId,
      recipientId,
      subject: dto.subject.trim(),
      body: dto.body.trim(),
      readAt: null,
    });
    const saved = await this.repo.save(m);
    const full = await this.repo.findOne({
      where: { id: saved.id },
      relations: ['sender', 'recipient'],
    });
    return toRow(full!);
  }
}
