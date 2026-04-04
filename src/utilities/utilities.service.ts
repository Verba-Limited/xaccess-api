import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UtilityUsage } from './entities/utility-usage.entity';
import { UtilityPreference } from './entities/utility-preference.entity';
import { UpdateUtilityPreferencesDto } from './dto/update-utility-preferences.dto';

@Injectable()
export class UtilitiesService {
  constructor(
    @InjectRepository(UtilityUsage)
    private readonly repo: Repository<UtilityUsage>,
    @InjectRepository(UtilityPreference)
    private readonly prefRepo: Repository<UtilityPreference>,
  ) {}

  /**
   * Last 12 months of usage for chart (annual view).
   */
  async seriesForUser(userId: string, communityId: string) {
    const rows = await this.repo.find({
      where: { userId, communityId },
      order: { yearMonth: 'ASC' },
      take: 24,
    });
    return rows.map((r) => ({
      yearMonth: r.yearMonth,
      power: r.electricityKwh,
      water: r.waterM3,
    }));
  }

  async getPreferences(userId: string, communityId: string) {
    let row = await this.prefRepo.findOne({ where: { userId, communityId } });
    if (!row) {
      row = this.prefRepo.create({
        userId,
        communityId,
        periodLabel: 'Annual',
        waterControlOn: true,
        powerControlOn: true,
      });
      await this.prefRepo.save(row);
    }
    return {
      periodLabel: row.periodLabel,
      waterControlOn: row.waterControlOn,
      powerControlOn: row.powerControlOn,
    };
  }

  async patchPreferences(
    userId: string,
    communityId: string,
    dto: UpdateUtilityPreferencesDto,
  ) {
    let row = await this.prefRepo.findOne({ where: { userId, communityId } });
    if (!row) {
      row = this.prefRepo.create({
        userId,
        communityId,
        periodLabel: dto.periodLabel ?? 'Annual',
        waterControlOn: dto.waterControlOn ?? true,
        powerControlOn: dto.powerControlOn ?? true,
      });
    } else {
      if (dto.periodLabel !== undefined) row.periodLabel = dto.periodLabel;
      if (dto.waterControlOn !== undefined) row.waterControlOn = dto.waterControlOn;
      if (dto.powerControlOn !== undefined) row.powerControlOn = dto.powerControlOn;
    }
    await this.prefRepo.save(row);
    return this.getPreferences(userId, communityId);
  }
}
