import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Community } from '../../communities/entities/community.entity';
import type { UtilityMeasurementPeriod } from '../utility-period.util';

@Entity('community_utility_configs')
export class CommunityUtilityConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'community_id', type: 'uuid', unique: true })
  communityId: string;

  @ManyToOne(() => Community, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'community_id' })
  community: Community;

  /**
   * How often prepaid entitlement resets and must be paid again.
   */
  @Column({ name: 'measurement_period', type: 'varchar', length: 8 })
  measurementPeriod: UtilityMeasurementPeriod;

  /** Fixed service charge (minor units) to unlock power+water quota for the period */
  @Column({ name: 'service_charge_minor', type: 'int' })
  serviceChargeMinor: number;

  /** Included electricity (kWh) after successful payment for the period */
  @Column({
    name: 'included_power_kwh',
    type: 'float',
    default: 0,
  })
  includedPowerKwh: number;

  /** Included water (m³) after successful payment for the period */
  @Column({
    name: 'included_water_m3',
    type: 'float',
    default: 0,
  })
  includedWaterM3: number;

  @Column({ type: 'varchar', length: 8, default: 'NGN' })
  currency: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
