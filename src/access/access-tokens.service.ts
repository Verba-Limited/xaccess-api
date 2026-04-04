import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  AccessToken,
  AccessTokenStatus,
  AccessTokenType,
} from './entities/access-token.entity';
import { CreateAccessTokenDto } from './dto/create-access-token.dto';
import { UserRole } from '../users/entities/user.entity';
import { JwtPayload } from '../auth/jwt.strategy';
import {
  AccessLog,
  AccessLogAction,
  CredentialType,
} from './entities/access-log.entity';

@Injectable()
export class AccessTokensService {
  constructor(
    @InjectRepository(AccessToken)
    private readonly tokenRepo: Repository<AccessToken>,
    @InjectRepository(AccessLog)
    private readonly logRepo: Repository<AccessLog>,
  ) {}

  digestToken(plain: string): string {
    return createHash('sha256').update(plain, 'utf8').digest('hex');
  }

  /** 6-digit numeric code (000000–999999), cryptographically random. */
  private generatePlainToken(): string {
    const n = randomInt(0, 1_000_000);
    return String(n).padStart(6, '0');
  }

  private async generateUniquePlainToken(): Promise<{ plain: string; digest: string }> {
    for (let attempt = 0; attempt < 64; attempt++) {
      const plain = this.generatePlainToken();
      const digest = this.digestToken(plain);
      const exists = await this.tokenRepo.exists({ where: { tokenDigest: digest } });
      if (!exists) return { plain, digest };
    }
    throw new BadRequestException('Could not generate a unique access code; try again.');
  }

  async create(jwt: JwtPayload, dto: CreateAccessTokenDto) {
    if (jwt.role !== UserRole.RESIDENT || !jwt.communityId) {
      throw new ForbiddenException('Only residents with a community can create tokens');
    }
    if (dto.methods.password && !dto.keypadPassword) {
      throw new BadRequestException('keypadPassword required when password method is enabled');
    }
    const { plain, digest } = await this.generateUniquePlainToken();
    let keypadPasswordHash: string | null = null;
    if (dto.keypadPassword) {
      keypadPasswordHash = await bcrypt.hash(dto.keypadPassword, 10);
    }
    const row = this.tokenRepo.create({
      residentId: jwt.sub,
      communityId: jwt.communityId,
      type: dto.type,
      tokenDigest: digest,
      methods: dto.methods,
      guestName: dto.guestName ?? null,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
      validTo: dto.validTo ? new Date(dto.validTo) : null,
      status: AccessTokenStatus.ACTIVE,
      keypadPasswordHash,
    });
    const saved = await this.tokenRepo.save(row);
    return {
      token: plain,
      tokenId: saved.id,
      expiresAt: saved.validTo,
      methods: saved.methods,
      guestName: saved.guestName,
      type: saved.type,
      warning: 'Store the token securely; it cannot be retrieved again.',
    };
  }

  async listMine(jwt: JwtPayload) {
    if (jwt.role !== UserRole.RESIDENT) {
      throw new ForbiddenException();
    }
    await this.expireStale();
    const rows = await this.tokenRepo.find({
      where: { residentId: jwt.sub },
      order: { createdAt: 'DESC' },
    });
    return rows.map((t) => ({
      id: t.id,
      type: t.type,
      methods: t.methods,
      guestName: t.guestName,
      validFrom: t.validFrom,
      validTo: t.validTo,
      status: t.status,
      createdAt: t.createdAt,
    }));
  }

  /** Plain token is never stored; UI shows a short digest preview only. */
  private formatTokenPreview(digest: string): string {
    return digest.length >= 6 ? `${digest.slice(0, 6)}…` : `${digest}…`;
  }

  private formatAccessType(type: AccessTokenType): string {
    const labels: Record<AccessTokenType, string> = {
      [AccessTokenType.TEMPORARY]: 'Temporary',
      [AccessTokenType.PERMANENT]: 'Permanent',
      [AccessTokenType.EVENT]: 'Event',
    };
    return labels[type] ?? type;
  }

  private toCommunityAdminRow(t: AccessToken) {
    const createdAt =
      t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt);
    return {
      id: t.id,
      guestName: t.guestName,
      hostName: t.resident?.fullName ?? '—',
      hostId: t.residentId,
      hostUnitLabel: t.resident?.unitLabel ?? null,
      tokenPreview: this.formatTokenPreview(t.tokenDigest),
      accessType: this.formatAccessType(t.type as AccessTokenType),
      status: t.status,
      validFrom: t.validFrom
        ? t.validFrom instanceof Date
          ? t.validFrom.toISOString()
          : String(t.validFrom)
        : null,
      validTo: t.validTo
        ? t.validTo instanceof Date
          ? t.validTo.toISOString()
          : String(t.validTo)
        : null,
      createdAt,
    };
  }

  async listForCommunityAdmin(communityId: string) {
    await this.expireStale();
    const rows = await this.tokenRepo.find({
      where: { communityId },
      relations: ['resident'],
      order: { createdAt: 'DESC' },
      take: 500,
    });
    return rows.map((t) => this.toCommunityAdminRow(t));
  }

  async getOneForCommunityAdmin(communityId: string, id: string) {
    await this.expireStale();
    const t = await this.tokenRepo.findOne({
      where: { id, communityId },
      relations: ['resident'],
    });
    if (!t) throw new NotFoundException('Token not found');
    return this.toCommunityAdminRow(t);
  }

  async revoke(jwt: JwtPayload, id: string) {
    const t = await this.tokenRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Token not found');
    if (t.residentId !== jwt.sub) throw new ForbiddenException();
    t.status = AccessTokenStatus.REVOKED;
    await this.tokenRepo.save(t);
    return { id: t.id, status: t.status };
  }

  async findByDigest(digest: string): Promise<AccessToken | null> {
    return this.tokenRepo.findOne({
      where: { tokenDigest: digest },
      relations: ['resident', 'community'],
    });
  }

  async expireStale(): Promise<void> {
    const now = new Date();
    await this.tokenRepo
      .createQueryBuilder()
      .update(AccessToken)
      .set({ status: AccessTokenStatus.EXPIRED })
      .where('status = :active', { active: AccessTokenStatus.ACTIVE })
      .andWhere('validTo IS NOT NULL')
      .andWhere('validTo < :now', { now })
      .execute();
  }

  async logAccess(entry: Partial<AccessLog>): Promise<AccessLog> {
    const log = this.logRepo.create(entry);
    return this.logRepo.save(log);
  }

  /** Manual check-in / check-out from facility admin UI (no gate device). */
  async manualFacilityLog(
    communityId: string,
    tokenId: string,
    adminUserId: string,
    action: AccessLogAction.ENTRY | AccessLogAction.EXIT,
  ): Promise<{ ok: boolean }> {
    await this.expireStale();
    const t = await this.tokenRepo.findOne({ where: { id: tokenId, communityId } });
    if (!t) throw new NotFoundException('Access token not found');

    if (action === AccessLogAction.ENTRY) {
      if (t.status !== AccessTokenStatus.ACTIVE) {
        throw new BadRequestException('Token is not active');
      }
      if (!this.validateTokenWindow(t)) {
        throw new BadRequestException('Token is outside its validity window');
      }
    } else {
      if (t.status === AccessTokenStatus.REVOKED) {
        throw new BadRequestException('Token is revoked');
      }
    }

    await this.logAccess({
      communityId,
      userId: t.residentId,
      accessTokenId: t.id,
      deviceId: null,
      action,
      credentialType: null,
      metadata: { source: 'FACILITY_ADMIN', performedByUserId: adminUserId },
    });
    return { ok: true };
  }

  listLogsForResident(residentId: string) {
    return this.logRepo.find({
      where: { userId: residentId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  listLogsForCommunity(communityId: string) {
    return this.logRepo.find({
      where: { communityId },
      order: { createdAt: 'DESC' },
      take: 500,
    });
  }

  validateTokenWindow(t: AccessToken): boolean {
    const now = new Date();
    if (t.validFrom && now < t.validFrom) return false;
    if (t.validTo && now > t.validTo) return false;
    return t.status === AccessTokenStatus.ACTIVE;
  }

  async validateQrCredential(plainToken: string): Promise<{
    allowed: boolean;
    token?: AccessToken;
    reason?: string;
  }> {
    await this.expireStale();
    const digest = this.digestToken(plainToken);
    const t = await this.findByDigest(digest);
    if (!t) return { allowed: false, reason: 'INVALID_TOKEN' };
    if (!this.validateTokenWindow(t)) {
      return { allowed: false, reason: 'TOKEN_INACTIVE_OR_EXPIRED', token: t };
    }
    return { allowed: true, token: t };
  }

  async validatePasswordCredential(
    plainToken: string,
    password: string,
  ): Promise<{ allowed: boolean; token?: AccessToken; reason?: string }> {
    const digest = this.digestToken(plainToken);
    const t = await this.findByDigest(digest);
    if (!t || !t.keypadPasswordHash) {
      return { allowed: false, reason: 'INVALID_OR_NO_PASSWORD' };
    }
    if (!this.validateTokenWindow(t)) {
      return { allowed: false, reason: 'TOKEN_INACTIVE_OR_EXPIRED' };
    }
    const ok = await bcrypt.compare(password, t.keypadPasswordHash);
    if (!ok) return { allowed: false, reason: 'BAD_PASSWORD' };
    return { allowed: true, token: t };
  }
}
