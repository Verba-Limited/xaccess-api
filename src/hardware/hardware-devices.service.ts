import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { HardwareDevice } from './entities/hardware-device.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class HardwareDevicesService {
  constructor(
    @InjectRepository(HardwareDevice)
    private readonly repo: Repository<HardwareDevice>,
  ) {}

  private generateApiKey(): string {
    return randomBytes(32).toString('hex');
  }

  async register(communityId: string, dto: RegisterDeviceDto) {
    const apiKey = this.generateApiKey();
    const d = this.repo.create({
      communityId,
      name: dto.name,
      type: dto.type,
      apiKey,
      isActive: true,
      lastSeenAt: new Date(),
    });
    const saved = await this.repo.save(d);
    return {
      id: saved.id,
      name: saved.name,
      type: saved.type,
      apiKey: saved.apiKey,
      message: 'Store apiKey on the device securely; rotate if compromised.',
    };
  }

  listByCommunity(communityId: string) {
    return this.repo.find({
      where: { communityId },
      order: { name: 'ASC' },
      select: ['id', 'name', 'type', 'isActive', 'lastSeenAt', 'createdAt'],
    });
  }

  findByApiKey(apiKey: string): Promise<HardwareDevice | null> {
    return this.repo.findOne({ where: { apiKey, isActive: true } });
  }

  async touch(deviceId: string): Promise<void> {
    await this.repo.update(deviceId, { lastSeenAt: new Date() });
  }
}
