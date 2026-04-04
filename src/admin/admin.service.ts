import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Community } from '../communities/entities/community.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { AccessLog } from '../access/entities/access-log.entity';
import { HardwareDevice } from '../hardware/entities/hardware-device.entity';
import { UsersService } from '../users/users.service';
import { CreateCommunityAdminDto } from './dto/create-community-admin.dto';
import { UpdateCommunityAdminDto } from './dto/update-community-admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Community)
    private readonly communities: Repository<Community>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(AccessLog)
    private readonly logs: Repository<AccessLog>,
    @InjectRepository(HardwareDevice)
    private readonly devices: Repository<HardwareDevice>,
    private readonly usersService: UsersService,
  ) {}

  async platformSummary() {
    const [
      communityCount,
      userCount,
      deviceCount,
      logCount,
      communityAdminCount,
      activeCommunityAdminCount,
    ] = await Promise.all([
      this.communities.count(),
      this.users.count(),
      this.devices.count(),
      this.logs.count(),
      this.users.count({ where: { role: UserRole.COMMUNITY_ADMIN } }),
      this.users.count({
        where: { role: UserRole.COMMUNITY_ADMIN, isActive: true },
      }),
    ]);
    return {
      communityCount,
      userCount,
      communityAdminCount,
      activeCommunityAdminCount,
      inactiveCommunityAdminCount: communityAdminCount - activeCommunityAdminCount,
      registeredHardwareDevices: deviceCount,
      accessLogEntries: logCount,
      generatedAt: new Date().toISOString(),
    };
  }

  async listCommunityAdmins() {
    const rows = await this.users.find({
      where: { role: UserRole.COMMUNITY_ADMIN },
      relations: ['community'],
      order: { fullName: 'ASC' },
    });
    return rows.map((u) => this.toAdminRow(u));
  }

  async getCommunityAdmin(id: string) {
    const u = await this.users.findOne({
      where: { id, role: UserRole.COMMUNITY_ADMIN },
      relations: ['community'],
    });
    if (!u) throw new NotFoundException('Community admin not found');
    return {
      ...this.toAdminRow(u),
      activityLog: [] as { date: string; activity: string }[],
    };
  }

  async createCommunityAdmin(dto: CreateCommunityAdminDto) {
    const existing = await this.usersService.findByEmail(dto.email.toLowerCase());
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email.toLowerCase(),
      passwordHash: hash,
      fullName: dto.fullName,
      role: UserRole.COMMUNITY_ADMIN,
      communityId: dto.communityId,
      phone: dto.phone ?? null,
    });
    const full = await this.users.findOne({
      where: { id: user.id },
      relations: ['community'],
    });
    return this.toAdminRow(full!);
  }

  async updateCommunityAdmin(id: string, dto: UpdateCommunityAdminDto) {
    const u = await this.users.findOne({
      where: { id, role: UserRole.COMMUNITY_ADMIN },
      relations: ['community'],
    });
    if (!u) throw new NotFoundException('Community admin not found');
    if (dto.email && dto.email.toLowerCase() !== u.email) {
      const taken = await this.usersService.findByEmail(dto.email.toLowerCase());
      if (taken && taken.id !== id) {
        throw new ConflictException('Email already in use');
      }
      u.email = dto.email.toLowerCase();
    }
    if (dto.fullName !== undefined) u.fullName = dto.fullName;
    if (dto.phone !== undefined) u.phone = dto.phone;
    if (dto.communityId !== undefined) u.communityId = dto.communityId;
    if (dto.isActive !== undefined) u.isActive = dto.isActive;
    if (dto.password) {
      u.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    await this.users.save(u);
    const reloaded = await this.users.findOne({
      where: { id },
      relations: ['community'],
    });
    return this.toAdminRow(reloaded!);
  }

  async deleteCommunityAdmin(id: string) {
    const u = await this.users.findOne({
      where: { id, role: UserRole.COMMUNITY_ADMIN },
    });
    if (!u) throw new NotFoundException('Community admin not found');
    u.isActive = false;
    await this.users.save(u);
    return { ok: true };
  }

  private toAdminRow(u: User) {
    return {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone ?? '—',
      facilityManaged: u.community?.name ?? '—',
      location: u.community?.address ?? '—',
      communityId: u.communityId,
      isActive: u.isActive,
      createdAt: u.createdAt,
    };
  }
}
