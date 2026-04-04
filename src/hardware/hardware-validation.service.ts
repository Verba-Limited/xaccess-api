import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValidateCredentialDto } from './dto/validate-credential.dto';
import { HardwareDevicesService } from './hardware-devices.service';
import { AccessTokensService } from '../access/access-tokens.service';
import { CredentialType, AccessLogAction } from '../access/entities/access-log.entity';
import { RfidCard } from '../access/entities/rfid-card.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class HardwareValidationService {
  constructor(
    private readonly devices: HardwareDevicesService,
    private readonly accessTokens: AccessTokensService,
    @InjectRepository(RfidCard)
    private readonly rfidRepo: Repository<RfidCard>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async validate(dto: ValidateCredentialDto) {
    const device = await this.devices.findByApiKey(dto.deviceApiKey);
    if (!device) {
      throw new UnauthorizedException('Invalid device');
    }
    await this.devices.touch(device.id);

    if (dto.credentialType === CredentialType.QR) {
      const res = await this.accessTokens.validateQrCredential(dto.value);
      if (!res.allowed || !res.token) {
        await this.accessTokens.logAccess({
          communityId: device.communityId,
          deviceId: device.id,
          action: AccessLogAction.DENIED,
          credentialType: CredentialType.QR,
          metadata: { reason: res.reason },
        });
        return { granted: false, reason: res.reason ?? 'DENIED' };
      }
      if (res.token.communityId !== device.communityId) {
        await this.accessTokens.logAccess({
          communityId: device.communityId,
          deviceId: device.id,
          action: AccessLogAction.DENIED,
          credentialType: CredentialType.QR,
          metadata: { reason: 'WRONG_COMMUNITY' },
        });
        return { granted: false, reason: 'WRONG_COMMUNITY' };
      }
      await this.accessTokens.logAccess({
        communityId: device.communityId,
        userId: res.token.residentId,
        accessTokenId: res.token.id,
        deviceId: device.id,
        action: AccessLogAction.ENTRY,
        credentialType: CredentialType.QR,
        metadata: null,
      });
      return { granted: true, accessTokenId: res.token.id };
    }

    if (dto.credentialType === CredentialType.PASSWORD) {
      const pwd = dto.keypadPassword ?? '';
      const res = await this.accessTokens.validatePasswordCredential(
        dto.value,
        pwd,
      );
      if (!res.allowed || !res.token) {
        await this.accessTokens.logAccess({
          communityId: device.communityId,
          deviceId: device.id,
          action: AccessLogAction.DENIED,
          credentialType: CredentialType.PASSWORD,
          metadata: { reason: res.reason },
        });
        return { granted: false, reason: res.reason ?? 'DENIED' };
      }
      if (res.token.communityId !== device.communityId) {
        return { granted: false, reason: 'WRONG_COMMUNITY' };
      }
      await this.accessTokens.logAccess({
        communityId: device.communityId,
        userId: res.token.residentId,
        accessTokenId: res.token.id,
        deviceId: device.id,
        action: AccessLogAction.ENTRY,
        credentialType: CredentialType.PASSWORD,
        metadata: null,
      });
      return { granted: true, accessTokenId: res.token.id };
    }

    if (dto.credentialType === CredentialType.RFID) {
      const card = await this.rfidRepo.findOne({
        where: { cardUid: dto.value, isActive: true },
        relations: ['user'],
      });
      if (!card || !card.user || !card.user.isActive) {
        await this.accessTokens.logAccess({
          communityId: device.communityId,
          deviceId: device.id,
          action: AccessLogAction.DENIED,
          credentialType: CredentialType.RFID,
          metadata: { reason: 'UNKNOWN_CARD' },
        });
        return { granted: false, reason: 'UNKNOWN_CARD' };
      }
      if (card.user.communityId !== device.communityId) {
        return { granted: false, reason: 'WRONG_COMMUNITY' };
      }
      await this.accessTokens.logAccess({
        communityId: device.communityId,
        userId: card.userId,
        deviceId: device.id,
        action: AccessLogAction.ENTRY,
        credentialType: CredentialType.RFID,
        metadata: { cardId: card.id },
      });
      return { granted: true, userId: card.userId };
    }

    return { granted: false, reason: 'UNSUPPORTED' };
  }
}
