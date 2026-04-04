import { Injectable } from '@nestjs/common';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

const DEFAULT_ACTIVITY = [
  { date: '01/05/2024', activity: 'Subscription renewed for current period' },
  { date: '15/04/2024', activity: 'Payment method updated' },
];

/**
 * In-memory stub until a Subscription entity exists. Replace with TypeORM + migrations.
 */
@Injectable()
export class AdminSubscriptionsService {
  private readonly store = new Map<
    string,
    {
      id: string;
      adminName: string;
      adminEmail: string;
      facility: string;
      plan: string;
      startDate: string;
      endDate: string;
      active: boolean;
      monthlyAmount: number;
      currency: string;
      activityLog: { date: string; activity: string }[];
    }
  >();

  getOne(id: string) {
    const hit = this.store.get(id);
    if (hit) {
      return hit;
    }
    return {
      id,
      adminName: 'Demo Subscriber',
      adminEmail: 'subscriber@example.com',
      facility: 'Facility A',
      plan: 'Basic Plan',
      startDate: '2024-01-01',
      endDate: '2025-01-01',
      active: true,
      monthlyAmount: 10,
      currency: 'USD',
      activityLog: [...DEFAULT_ACTIVITY],
    };
  }

  update(id: string, dto: UpdateSubscriptionDto) {
    const base = this.getOne(id);
    const { isActive, ...fields } = dto;
    const merged = {
      ...base,
      ...fields,
      id,
      active: isActive !== undefined ? isActive : base.active,
    };
    this.store.set(id, merged);
    return merged;
  }
}
