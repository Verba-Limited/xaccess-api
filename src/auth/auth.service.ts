import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JoinCommunityDto } from './dto/join-community.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole } from '../users/entities/user.entity';
import { JwtPayload } from './jwt.strategy';
import { CommunitiesService } from '../communities/communities.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly communitiesService: CommunitiesService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    if (dto.communityId) {
      const community = await this.communitiesService.findById(dto.communityId);
      if (!community.isActive) {
        throw new BadRequestException('This community is not accepting new registrations');
      }
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      fullName: dto.fullName,
      role: UserRole.RESIDENT,
      communityId: dto.communityId ?? null,
    });
    const token = await this.signToken(user.id, user.email, user.role, user.communityId);
    return {
      accessToken: token,
      user: this.usersService.toPublic(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account disabled');
    }
    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const accessToken = await this.signToken(
      user.id,
      user.email,
      user.role,
      user.communityId,
    );
    return {
      accessToken,
      user: this.usersService.toPublic(user),
    };
  }

  /**
   * Resident only: attach account to a community and return a new JWT with communityId set.
   */
  async joinCommunity(jwt: JwtPayload, dto: JoinCommunityDto) {
    if (jwt.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can join a community');
    }
    if (!dto.communityId && !dto.slug) {
      throw new BadRequestException('Provide communityId or slug');
    }

    let communityId = dto.communityId ?? null;
    if (!communityId && dto.slug) {
      const c = await this.communitiesService.findBySlug(dto.slug);
      if (!c) {
        throw new NotFoundException('Community not found');
      }
      communityId = c.id;
    }
    if (!communityId) {
      throw new BadRequestException('Invalid community');
    }

    const community = await this.communitiesService.findById(communityId);
    if (!community.isActive) {
      throw new BadRequestException('This community is not accepting joins');
    }

    const user = await this.usersService.assignCommunity(jwt.sub, communityId);
    const accessToken = await this.signToken(
      user.id,
      user.email,
      user.role,
      user.communityId,
    );
    return {
      accessToken,
      user: this.usersService.toPublic(user),
    };
  }

  async changePassword(jwt: JwtPayload, dto: ChangePasswordDto) {
    const user = await this.usersService.findByIdOrFail(jwt.sub);
    const match = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!match) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.setPasswordHash(jwt.sub, hash);
    return { ok: true };
  }

  private async signToken(
    sub: string,
    email: string,
    role: UserRole,
    communityId: string | null,
  ): Promise<string> {
    const payload: JwtPayload = { sub, email, role, communityId };
    return this.jwtService.signAsync(payload);
  }
}
