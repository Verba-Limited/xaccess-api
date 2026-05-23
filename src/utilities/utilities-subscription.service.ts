import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityUtilityConfig } from './entities/community-utility-config.entity';
import { ResidentUtilityCycle } from './entities/resident-utility-cycle.entity';
import {
  computePeriodWindow,
  type UtilityMeasurementPeriod,
} from './utility-period.util';

export interface UtilityAvailability {
  canUsePower: boolean;
  canUseWater: boolean;
  reasonPower: string | null;
  reasonWater: string | null;
}

export interface ResidentSubscriptionDto {
  measurementPeriod: UtilityMeasurementPeriod;
  periodKey: string;
  periodStartsAt: string;
  periodEndsAt: string;
  paidForPeriod: boolean;
  serviceChargeMinor: number;
  currency: string;
  quotaPowerKwh: number;
  quotaWaterM3: number;
  usedPowerKwh: number;
  usedWaterM3: number;
  remainingPowerKwh: number;
  remainingWaterM3: number;
  canUsePower: boolean;
  canUseWater: boolean;
}

@Injectable()
export class UtilitiesSubscriptionService {
  constructor(
    @InjectRepository(CommunityUtilityConfig)
    private readonly configRepo: Repository<CommunityUtilityConfig>,
    @InjectRepository(ResidentUtilityCycle)
    private readonly cycleRepo: Repository<ResidentUtilityCycle>,
  ) {}

  async getConfig(communityId: string): Promise<CommunityUtilityConfig | null> {
    return this.configRepo.findOne({ where: { communityId, isActive: true } });
  }

  async ensureDefaultConfig(communityId: string): Promise<CommunityUtilityConfig> {
    let row = await this.getConfig(communityId);
    if (!row) {
      row = this.configRepo.create({
        communityId,
        measurementPeriod: 'MONTH',
        serviceChargeMinor: 500000,
        includedPowerKwh: 120,
        includedWaterM3: 35,
        currency: 'NGN',
        isActive: true,
      });
      await this.configRepo.save(row);
    }
    return row;
  }

  async upsertCommunityConfig(
    communityId: string,
    patch: Partial<{
      measurementPeriod: UtilityMeasurementPeriod;
      serviceChargeMinor: number;
      includedPowerKwh: number;
      includedWaterM3: number;
      currency: string;
      isActive: boolean;
    }>,
  ): Promise<CommunityUtilityConfig> {
    let row = await this.configRepo.findOne({ where: { communityId } });
    if (!row) {
      row = this.configRepo.create({
        communityId,
        measurementPeriod: patch.measurementPeriod ?? 'MONTH',
        serviceChargeMinor: Math.round(patch.serviceChargeMinor ?? 0),
        includedPowerKwh: patch.includedPowerKwh ?? 0,
        includedWaterM3: patch.includedWaterM3 ?? 0,
        currency: patch.currency ?? 'NGN',
        isActive: patch.isActive ?? true,
      });
    } else {
      if (patch.measurementPeriod !== undefined)
        row.measurementPeriod = patch.measurementPeriod;
      if (patch.serviceChargeMinor !== undefined)
        row.serviceChargeMinor = Math.round(patch.serviceChargeMinor);
      if (patch.includedPowerKwh !== undefined)
        row.includedPowerKwh = patch.includedPowerKwh;
      if (patch.includedWaterM3 !== undefined)
        row.includedWaterM3 = patch.includedWaterM3;
      if (patch.currency !== undefined) row.currency = patch.currency;
      if (patch.isActive !== undefined) row.isActive = patch.isActive;
    }
    return this.configRepo.save(row);
  }

  private async getCurrentCycleRow(
    userId: string,
    communityId: string,
    cfg: CommunityUtilityConfig,
  ): Promise<ResidentUtilityCycle | null> {
    const { periodKey } = computePeriodWindow(cfg.measurementPeriod);
    return this.cycleRepo.findOne({
      where: { userId, communityId, periodKey },
    });
  }

  async getResidentSubscription(
    userId: string,
    communityId: string,
  ): Promise<ResidentSubscriptionDto> {
    const cfg = await this.ensureDefaultConfig(communityId);
    const win = computePeriodWindow(cfg.measurementPeriod);
    let cycle = await this.getCurrentCycleRow(userId, communityId, cfg);
    const paidForPeriod = Boolean(cycle?.paidAt);
    const quotaPower = paidForPeriod ? cycle!.quotaPowerKwh : 0;
    const quotaWater = paidForPeriod ? cycle!.quotaWaterM3 : 0;
    const usedPower = paidForPeriod ? cycle!.usedPowerKwh : 0;
    const usedWater = paidForPeriod ? cycle!.usedWaterM3 : 0;
    const remainingPower = Math.max(0, quotaPower - usedPower);
    const remainingWater = Math.max(0, quotaWater - usedWater);
    return {
      measurementPeriod: cfg.measurementPeriod,
      periodKey: win.periodKey,
      periodStartsAt: win.periodStartsAt.toISOString(),
      periodEndsAt: win.periodEndsAt.toISOString(),
      paidForPeriod,
      serviceChargeMinor: cfg.serviceChargeMinor,
      currency: cfg.currency,
      quotaPowerKwh: quotaPower,
      quotaWaterM3: quotaWater,
      usedPowerKwh: usedPower,
      usedWaterM3: usedWater,
      remainingPowerKwh: Math.round(remainingPower * 100) / 100,
      remainingWaterM3: Math.round(remainingWater * 1000) / 1000,
      canUsePower: paidForPeriod && remainingPower > 0 && cfg.includedPowerKwh > 0,
      canUseWater: paidForPeriod && remainingWater > 0 && cfg.includedWaterM3 > 0,
    };
  }

  async getAvailability(
    userId: string,
    communityId: string,
  ): Promise<UtilityAvailability> {
    const sub = await this.getResidentSubscription(userId, communityId);
    let reasonPower: string | null = null;
    let reasonWater: string | null = null;
    if (!sub.paidForPeriod) {
      reasonPower = 'Pay the utility service charge for this period to use power.';
      reasonWater = 'Pay the utility service charge for this period to use water.';
    } else if (sub.remainingPowerKwh <= 0 && sub.quotaPowerKwh > 0) {
      reasonPower = 'Power allocation for this period is exhausted.';
    } else if (sub.quotaPowerKwh <= 0) {
      reasonPower = 'Power is not included in this estate utility plan.';
    }
    if (!sub.paidForPeriod) {
      /* already set */
    } else if (sub.remainingWaterM3 <= 0 && sub.quotaWaterM3 > 0) {
      reasonWater = 'Water allocation for this period is exhausted.';
    } else if (sub.quotaWaterM3 <= 0) {
      reasonWater = 'Water is not included in this estate utility plan.';
    }
    return {
      canUsePower: sub.canUsePower,
      canUseWater: sub.canUseWater,
      reasonPower: sub.canUsePower ? null : reasonPower,
      reasonWater: sub.canUseWater ? null : reasonWater,
    };
  }

  async payCurrentPeriod(userId: string, communityId: string) {
    const cfg = await this.ensureDefaultConfig(communityId);
    const win = computePeriodWindow(cfg.measurementPeriod);
    let cycle = await this.cycleRepo.findOne({
      where: { userId, communityId, periodKey: win.periodKey },
    });
    if (!cycle) {
      cycle = this.cycleRepo.create({
        userId,
        communityId,
        periodKey: win.periodKey,
        periodStartsAt: win.periodStartsAt,
        periodEndsAt: win.periodEndsAt,
        quotaPowerKwh: cfg.includedPowerKwh,
        quotaWaterM3: cfg.includedWaterM3,
        usedPowerKwh: 0,
        usedWaterM3: 0,
        paidAt: new Date(),
      });
    } else {
      cycle.periodStartsAt = win.periodStartsAt;
      cycle.periodEndsAt = win.periodEndsAt;
      cycle.quotaPowerKwh = cfg.includedPowerKwh;
      cycle.quotaWaterM3 = cfg.includedWaterM3;
      cycle.usedPowerKwh = 0;
      cycle.usedWaterM3 = 0;
      cycle.paidAt = new Date();
    }
    await this.cycleRepo.save(cycle);
    return this.getResidentSubscription(userId, communityId);
  }

  async recordConsumption(
    communityId: string,
    residentId: string,
    deltaPowerKwh: number,
    deltaWaterM3: number,
  ) {
    if (deltaPowerKwh < 0 || deltaWaterM3 < 0) {
      throw new BadRequestException('Consumption deltas must be non-negative');
    }
    if (deltaPowerKwh === 0 && deltaWaterM3 === 0) {
      throw new BadRequestException('Provide powerKwh and/or waterM3 to record');
    }
    const cfg = await this.getConfig(communityId);
    if (!cfg) throw new NotFoundException('Utility configuration not found');
    const win = computePeriodWindow(cfg.measurementPeriod);
    const cycle = await this.cycleRepo.findOne({
      where: { userId: residentId, communityId, periodKey: win.periodKey },
    });
    if (!cycle?.paidAt) {
      throw new BadRequestException(
        'Resident has not paid for the current utility period; consumption cannot be applied.',
      );
    }
    cycle.usedPowerKwh = Math.round((cycle.usedPowerKwh + deltaPowerKwh) * 1000) / 1000;
    cycle.usedWaterM3 = Math.round((cycle.usedWaterM3 + deltaWaterM3) * 10000) / 10000;
    await this.cycleRepo.save(cycle);
    return this.getResidentSubscription(residentId, communityId);
  }

  async getCommunityConfigPublic(communityId: string) {
    const cfg = await this.ensureDefaultConfig(communityId);
    return {
      measurementPeriod: cfg.measurementPeriod,
      serviceChargeMinor: cfg.serviceChargeMinor,
      includedPowerKwh: cfg.includedPowerKwh,
      includedWaterM3: cfg.includedWaterM3,
      currency: cfg.currency,
      isActive: cfg.isActive,
    };
  }

  async findCyclesForCommunityPeriod(
    communityId: string,
    periodKey: string,
  ): Promise<ResidentUtilityCycle[]> {
    return this.cycleRepo.find({ where: { communityId, periodKey } });
  }
}
