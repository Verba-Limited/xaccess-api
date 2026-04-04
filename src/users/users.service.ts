import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import type { UpdateMeDto } from './dto/update-me.dto';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  communityId: string | null;
  phone?: string | null;
  unitLabel?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const u = this.repo.create({
      email: input.email,
      passwordHash: input.passwordHash,
      fullName: input.fullName,
      phone: input.phone ?? null,
      unitLabel: input.unitLabel ?? null,
      role: input.role,
      communityId: input.communityId,
      isActive: true,
    });
    return this.repo.save(u);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id }, relations: ['community'] });
  }

  async findByIdOrFail(id: string): Promise<User> {
    const u = await this.findById(id);
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  async setActive(id: string, isActive: boolean): Promise<User> {
    const u = await this.findByIdOrFail(id);
    u.isActive = isActive;
    return this.repo.save(u);
  }

  /**
   * Resident: link account to a community (only when not already assigned).
   */
  async assignCommunity(userId: string, communityId: string): Promise<User> {
    const u = await this.findByIdOrFail(userId);
    if (u.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can join a community');
    }
    if (u.communityId) {
      throw new BadRequestException('Already in a community');
    }
    u.communityId = communityId;
    return this.repo.save(u);
  }

  listResidentsInCommunity(communityId: string): Promise<User[]> {
    return this.repo.find({
      where: { communityId, role: UserRole.RESIDENT },
      order: { fullName: 'ASC' },
    });
  }

  /** Neighbor directory: active residents in the same community (safe fields). */
  async listNeighborDirectory(
    communityId: string,
    excludeUserId?: string,
  ): Promise<
    { id: string; fullName: string; phone: string | null; unitLabel: string | null }[]
  > {
    const qb = this.repo
      .createQueryBuilder('u')
      .select(['u.id', 'u.fullName', 'u.phone', 'u.unitLabel'])
      .where('u.community_id = :cid', { cid: communityId })
      .andWhere('u.role = :role', { role: UserRole.RESIDENT })
      .andWhere('u.is_active = :active', { active: true })
      .orderBy('u.fullName', 'ASC');
    if (excludeUserId) {
      qb.andWhere('u.id != :ex', { ex: excludeUserId });
    }
    const rows = await qb.getMany();
    return rows.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      phone: u.phone,
      unitLabel: u.unitLabel,
    }));
  }

  async findFirstActiveCommunityAdmin(
    communityId: string,
  ): Promise<User | null> {
    return this.repo.findOne({
      where: {
        communityId,
        role: UserRole.COMMUNITY_ADMIN,
        isActive: true,
      },
      order: { createdAt: 'ASC' },
    });
  }

  async updateProfile(id: string, dto: UpdateMeDto): Promise<User> {
    const u = await this.findByIdOrFail(id);
    if (dto.fullName !== undefined) u.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) u.phone = dto.phone?.trim() ? dto.phone.trim() : null;
    if (dto.unitLabel !== undefined) {
      u.unitLabel = dto.unitLabel?.trim() ? dto.unitLabel.trim() : null;
    }
    return this.repo.save(u);
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    const u = await this.findByIdOrFail(userId);
    u.passwordHash = passwordHash;
    await this.repo.save(u);
  }

  toPublic(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      unitLabel: user.unitLabel,
      role: user.role,
      communityId: user.communityId,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
