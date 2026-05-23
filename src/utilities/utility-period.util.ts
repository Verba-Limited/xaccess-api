/** How the facility meters prepaid utility entitlement */
export type UtilityMeasurementPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export interface PeriodWindow {
  periodKey: string;
  periodStartsAt: Date;
  periodEndsAt: Date;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** ISO week number (1–53), Monday as first day of week */
function isoWeekYearAndNumber(d: Date): { isoYear: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { isoYear: date.getUTCFullYear(), week };
}

export function computePeriodWindow(
  period: UtilityMeasurementPeriod,
  ref: Date = new Date(),
): PeriodWindow {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const day = ref.getDate();

  switch (period) {
    case 'DAY': {
      const start = new Date(y, m, day, 0, 0, 0, 0);
      const end = new Date(y, m, day, 23, 59, 59, 999);
      return {
        periodKey: `${y}-${pad2(m + 1)}-${pad2(day)}`,
        periodStartsAt: start,
        periodEndsAt: end,
      };
    }
    case 'WEEK': {
      const { isoYear, week } = isoWeekYearAndNumber(ref);
      const jan1 = new Date(isoYear, 0, 1);
      const offset = (jan1.getDay() + 6) % 7;
      const monday = new Date(isoYear, 0, 1 - offset + (week - 1) * 7);
      const start = new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate(),
        0,
        0,
        0,
        0,
      );
      const sunday = new Date(start);
      sunday.setDate(sunday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return {
        periodKey: `${isoYear}-W${pad2(week)}`,
        periodStartsAt: start,
        periodEndsAt: sunday,
      };
    }
    case 'MONTH': {
      const start = new Date(y, m, 1, 0, 0, 0, 0);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      return {
        periodKey: `${y}-${pad2(m + 1)}`,
        periodStartsAt: start,
        periodEndsAt: end,
      };
    }
    case 'YEAR': {
      const start = new Date(y, 0, 1, 0, 0, 0, 0);
      const end = new Date(y, 11, 31, 23, 59, 59, 999);
      return {
        periodKey: `${y}`,
        periodStartsAt: start,
        periodEndsAt: end,
      };
    }
  }
}

export function parseMeasurementPeriod(s: string): UtilityMeasurementPeriod | null {
  const u = s?.toUpperCase();
  if (u === 'DAY' || u === 'WEEK' || u === 'MONTH' || u === 'YEAR') return u;
  return null;
}
