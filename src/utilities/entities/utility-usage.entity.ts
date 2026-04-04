import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Community } from '../../communities/entities/community.entity';
import { User } from '../../users/entities/user.entity';

@Entity('utility_usage')
@Unique(['userId', 'yearMonth'])
export class UtilityUsage {
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

  /** Format YYYY-MM */
  @Column({ name: 'year_month', length: 7 })
  yearMonth: string;

  @Column({ name: 'electricity_kwh', type: 'float' })
  electricityKwh: number;

  @Column({ name: 'water_m3', type: 'float' })
  waterM3: number;
}
