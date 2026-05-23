import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Community } from '../../communities/entities/community.entity';
import { User } from '../../users/entities/user.entity';

/**
 * One row per resident per billing period (periodKey).
 * Quotas apply only after `paidAt` is set for that window.
 */
@Entity('resident_utility_cycles')
@Index(['userId', 'periodKey'], { unique: true })
export class ResidentUtilityCycle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'community_id', type: 'uuid' })
  communityId: string;

  @ManyToOne(() => Community, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'community_id' })
  community: Community;

  /** Matches computePeriodWindow(...).periodKey */
  @Column({ name: 'period_key', type: 'varchar', length: 16 })
  periodKey: string;

  @Column({ name: 'period_starts_at', type: 'datetime' })
  periodStartsAt: Date;

  @Column({ name: 'period_ends_at', type: 'datetime' })
  periodEndsAt: Date;

  @Column({ name: 'quota_power_kwh', type: 'float', default: 0 })
  quotaPowerKwh: number;

  @Column({ name: 'quota_water_m3', type: 'float', default: 0 })
  quotaWaterM3: number;

  @Column({ name: 'used_power_kwh', type: 'float', default: 0 })
  usedPowerKwh: number;

  @Column({ name: 'used_water_m3', type: 'float', default: 0 })
  usedWaterM3: number;

  /** When the resident paid the service charge for this period (null = not entitled) */
  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
