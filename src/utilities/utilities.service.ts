import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UtilityUsage } from './entities/utility-usage.entity';
import { UtilityPreference } from './entities/utility-preference.entity';
import { UpdateUtilityPreferencesDto } from './dto/update-utility-preferences.dto';
import { UpdateCommunityUtilityConfigDto } from './dto/update-community-utility-config.dto';
import { RecordUtilityConsumptionDto } from './dto/record-utility-consumption.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { UtilitiesSubscriptionService } from './utilities-subscription.service';
import { UtilityPaystackService } from './utility-paystack.service';
import { computePeriodWindow } from './utility-period.util';

export type UtilityPeriod = 'Monthly' | 'Quarterly' | 'Annual';

export interface UsageChartPoint {
  label: string;
  yearMonth: string | null;
  electricityKwh: number;
  waterM3: number;
  powerPct: number;
  waterPct: number;
}

export interface UsageReportDto {
  period: UtilityPeriod;
  points: UsageChartPoint[];
  totals: { electricityKwh: number; waterM3: number };
  latestMonth: string | null;
}

export interface CommunityUtilityMonthRow {
  yearMonth: string;
  electricityKwh: number;
  waterM3: number;
  residentCount: number;
}

export interface ResidentUtilityRow {
  residentId: string;
  fullName: string;
  unitLabel: string | null;
  lastReadingMonth: string | null;
  electricityKwh: number | null;
  waterM3: number | null;
  /** Current prepaid utility window */
  utilityPeriodKey: string | null;
  utilityPaidForPeriod: boolean;
  utilityRemainingPowerKwh: number | null;
  utilityRemainingWaterM3: number | null;
}

@Injectable()
export class UtilitiesService {
  constructor(
    @InjectRepository(UtilityUsage)
    private readonly repo: Repository<UtilityUsage>,
    @InjectRepository(UtilityPreference)
    private readonly prefRepo: Repository<UtilityPreference>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly subscriptions: UtilitiesSubscriptionService,
    private readonly utilityPaystack: UtilityPaystackService,
  ) {}

  private monthShort(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, (m || 1) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }

  private normalizeBars(
    points: Omit<UsageChartPoint, 'powerPct' | 'waterPct'>[],
  ): UsageChartPoint[] {
    const maxE = Math.max(...points.map((p) => p.electricityKwh), 0.001);
    const maxW = Math.max(...points.map((p) => p.waterM3), 0.001);
    return points.map((p) => ({
      ...p,
      powerPct: Math.min(100, Math.round((p.electricityKwh / maxE) * 100)),
      waterPct: Math.min(100, Math.round((p.waterM3 / maxW) * 100)),
    }));
  }

  /**
   * Usage chart + totals for the signed-in resident.
   * @param periodOverride optional query param; otherwise loads saved preference.
   */
  async getUsageReport(
    userId: string,
    communityId: string,
    periodOverride: UtilityPeriod | null,
  ): Promise<UsageReportDto> {
    let period: UtilityPeriod = 'Annual';
    if (periodOverride) {
      period = periodOverride;
    } else {
      const prefs = await this.getPreferences(userId, communityId);
      period = prefs.periodLabel as UtilityPeriod;
    }

    const rows = await this.repo.find({
      where: { userId, communityId },
      order: { yearMonth: 'ASC' },
    });

    if (rows.length === 0) {
      return {
        period,
        points: [],
        totals: { electricityKwh: 0, waterM3: 0 },
        latestMonth: null,
      };
    }

    const last12 = rows.slice(-12);
    const latestMonth = last12[last12.length - 1]?.yearMonth ?? null;

    if (period === 'Quarterly') {
      const bucket = new Map<
        string,
        { label: string; yearMonth: string | null; electricityKwh: number; waterM3: number }
      >();
      for (const r of last12) {
        const [yStr, mStr] = r.yearMonth.split('-');
        const y = Number(yStr);
        const m = Number(mStr);
        const q = Math.ceil(m / 3);
        const key = `${y}-Q${q}`;
        const label = `Q${q} '${String(y).slice(-2)}`;
        const cur = bucket.get(key) ?? {
          label,
          yearMonth: null,
          electricityKwh: 0,
          waterM3: 0,
        };
        cur.electricityKwh += r.electricityKwh;
        cur.waterM3 += r.waterM3;
        cur.yearMonth = r.yearMonth;
        bucket.set(key, cur);
      }
      const keys = [...bucket.keys()].sort();
      const last4Keys = keys.slice(-4);
      const raw = last4Keys.map((k) => {
        const b = bucket.get(k)!;
        return {
          label: b.label,
          yearMonth: b.yearMonth,
          electricityKwh: Math.round(b.electricityKwh * 10) / 10,
          waterM3: Math.round(b.waterM3 * 100) / 100,
        };
      });
      const totals = raw.reduce(
        (acc, p) => ({
          electricityKwh: acc.electricityKwh + p.electricityKwh,
          waterM3: acc.waterM3 + p.waterM3,
        }),
        { electricityKwh: 0, waterM3: 0 },
      );
      return {
        period,
        points: this.normalizeBars(raw),
        totals: {
          electricityKwh: Math.round(totals.electricityKwh * 10) / 10,
          waterM3: Math.round(totals.waterM3 * 100) / 100,
        },
        latestMonth,
      };
    }

    // Monthly & Annual: same 12-month trend; totals differ in copy on client (sum of displayed range)
    const raw = last12.map((r) => ({
      label: this.monthShort(r.yearMonth),
      yearMonth: r.yearMonth,
      electricityKwh: Math.round(r.electricityKwh * 10) / 10,
      waterM3: Math.round(r.waterM3 * 100) / 100,
    }));
    const totals = raw.reduce(
      (acc, p) => ({
        electricityKwh: acc.electricityKwh + p.electricityKwh,
        waterM3: acc.waterM3 + p.waterM3,
      }),
      { electricityKwh: 0, waterM3: 0 },
    );
    return {
      period,
      points: this.normalizeBars(raw),
      totals: {
        electricityKwh: Math.round(totals.electricityKwh * 10) / 10,
        waterM3: Math.round(totals.waterM3 * 100) / 100,
      },
      latestMonth,
    };
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
    const subscription = await this.subscriptions.getResidentSubscription(
      userId,
      communityId,
    );
    const utilityGate = await this.subscriptions.getAvailability(
      userId,
      communityId,
    );
    return {
      periodLabel: row.periodLabel,
      waterControlOn: row.waterControlOn,
      powerControlOn: row.powerControlOn,
      updatedAt: row.updatedAt,
      subscription,
      utilityGate,
    };
  }

  async patchPreferences(
    userId: string,
    communityId: string,
    dto: UpdateUtilityPreferencesDto,
  ) {
    const gate = await this.subscriptions.getAvailability(userId, communityId);
    if (dto.powerControlOn === true && !gate.canUsePower) {
      throw new BadRequestException(
        gate.reasonPower ?? 'Power cannot be enabled until quota is available.',
      );
    }
    if (dto.waterControlOn === true && !gate.canUseWater) {
      throw new BadRequestException(
        gate.reasonWater ?? 'Water cannot be enabled until quota is available.',
      );
    }

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

  /** Community totals by month (all residents) for facility dashboard chart */
  async communityUsageByMonth(communityId: string): Promise<CommunityUtilityMonthRow[]> {
    const rows = await this.repo.find({
      where: { communityId },
      order: { yearMonth: 'ASC' },
    });
    const agg = new Map<
      string,
      { electricityKwh: number; waterM3: number; users: Set<string> }
    >();
    for (const r of rows) {
      const cur = agg.get(r.yearMonth) ?? {
        electricityKwh: 0,
        waterM3: 0,
        users: new Set<string>(),
      };
      cur.electricityKwh += r.electricityKwh;
      cur.waterM3 += r.waterM3;
      cur.users.add(r.userId);
      agg.set(r.yearMonth, cur);
    }
    return [...agg.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([yearMonth, v]) => ({
        yearMonth,
        electricityKwh: Math.round(v.electricityKwh * 10) / 10,
        waterM3: Math.round(v.waterM3 * 100) / 100,
        residentCount: v.users.size,
      }));
  }

  /** Per-resident latest meter reading for facility admin table */
  async communityResidentsUsage(communityId: string): Promise<ResidentUtilityRow[]> {
    const residents = await this.userRepo.find({
      where: { communityId, role: UserRole.RESIDENT, isActive: true },
      order: { fullName: 'ASC' },
    });

    if (residents.length === 0) return [];

    const usages = await this.repo.find({
      where: { communityId },
      order: { yearMonth: 'DESC' },
    });

    const latestByUser = new Map<string, UtilityUsage>();
    for (const u of usages) {
      if (!latestByUser.has(u.userId)) {
        latestByUser.set(u.userId, u);
      }
    }

    const cfg = await this.subscriptions.ensureDefaultConfig(communityId);
    const win = computePeriodWindow(cfg.measurementPeriod);
    const cycles = await this.subscriptions.findCyclesForCommunityPeriod(
      communityId,
      win.periodKey,
    );
    const cycleByUser = new Map(cycles.map((c) => [c.userId, c]));

    return residents.map((r) => {
      const latest = latestByUser.get(r.id);
      const c = cycleByUser.get(r.id) as
        | {
            paidAt: Date | null;
            quotaPowerKwh: number;
            quotaWaterM3: number;
            usedPowerKwh: number;
            usedWaterM3: number;
          }
        | undefined;
      const paid = Boolean(c?.paidAt);
      const remP =
        c != null && paid
          ? Math.max(0, c.quotaPowerKwh - c.usedPowerKwh)
          : null;
      const remW =
        c != null && paid
          ? Math.max(0, c.quotaWaterM3 - c.usedWaterM3)
          : null;
      return {
        residentId: r.id,
        fullName: r.fullName,
        unitLabel: r.unitLabel,
        lastReadingMonth: latest?.yearMonth ?? null,
        electricityKwh: latest != null ? latest.electricityKwh : null,
        waterM3: latest != null ? latest.waterM3 : null,
        utilityPeriodKey: win.periodKey,
        utilityPaidForPeriod: paid,
        utilityRemainingPowerKwh: remP != null ? Math.round(remP * 100) / 100 : null,
        utilityRemainingWaterM3: remW != null ? Math.round(remW * 1000) / 1000 : null,
      };
    });
  }

  async getMySubscription(userId: string, communityId: string) {
    return this.subscriptions.getResidentSubscription(userId, communityId);
  }

  async payMyUtilitySubscription(userId: string, communityId: string) {
    return this.subscriptions.payCurrentPeriod(userId, communityId);
  }

  initializeUtilityPaystack(userId: string, communityId: string) {
    return this.utilityPaystack.initializeUtilityPayment(userId, communityId);
  }

  verifyUtilityPaystack(
    userId: string,
    communityId: string,
    reference: string,
  ) {
    return this.utilityPaystack.verifyAndApplyUtilityPayment(
      userId,
      communityId,
      reference,
    );
  }

  getCommunityUtilityConfig(communityId: string) {
    return this.subscriptions.getCommunityConfigPublic(communityId);
  }

  async updateCommunityUtilityConfig(
    communityId: string,
    dto: UpdateCommunityUtilityConfigDto,
  ) {
    await this.subscriptions.upsertCommunityConfig(communityId, {
      measurementPeriod: dto.measurementPeriod,
      serviceChargeMinor: dto.serviceChargeMinor,
      includedPowerKwh: dto.includedPowerKwh,
      includedWaterM3: dto.includedWaterM3,
      currency: dto.currency,
      isActive: dto.isActive,
    });
    /** Plain object — avoids serializing TypeORM relations / metadata on the entity. */
    return this.subscriptions.getCommunityConfigPublic(communityId);
  }

  async recordResidentConsumption(
    communityId: string,
    residentId: string,
    dto: RecordUtilityConsumptionDto,
  ) {
    const u = await this.userRepo.findOne({ where: { id: residentId } });
    if (!u || u.communityId !== communityId || u.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Resident not in this community');
    }
    const p = dto.powerKwh ?? 0;
    const w = dto.waterM3 ?? 0;
    if (p <= 0 && w <= 0) {
      throw new BadRequestException('Provide powerKwh and/or waterM3 greater than zero');
    }
    return this.subscriptions.recordConsumption(communityId, residentId, p, w);
  }

  async communitySummary(communityId: string) {
    const byMonth = await this.communityUsageByMonth(communityId);
    const last = byMonth.slice(-12);
    const totals = last.reduce(
      (a, r) => ({
        electricityKwh: a.electricityKwh + r.electricityKwh,
        waterM3: a.waterM3 + r.waterM3,
      }),
      { electricityKwh: 0, waterM3: 0 },
    );
    const maxE = Math.max(...last.map((r) => r.electricityKwh), 0.001);
    const maxW = Math.max(...last.map((r) => r.waterM3), 0.001);
    const chartPoints = last.map((r) => ({
      label: this.monthShort(r.yearMonth),
      yearMonth: r.yearMonth,
      electricityKwh: Math.round(r.electricityKwh * 10) / 10,
      waterM3: Math.round(r.waterM3 * 100) / 100,
      powerPct: Math.min(100, Math.round((r.electricityKwh / maxE) * 100)),
      waterPct: Math.min(100, Math.round((r.waterM3 / maxW) * 100)),
      residentCount: r.residentCount,
    }));
    return {
      monthsInView: last.length,
      totals: {
        electricityKwh: Math.round(totals.electricityKwh * 10) / 10,
        waterM3: Math.round(totals.waterM3 * 100) / 100,
      },
      chartPoints,
    };
  }
}
