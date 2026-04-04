import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Community } from '../../communities/entities/community.entity';
import { User } from '../../users/entities/user.entity';

/** Per-resident utility UI preferences (chart period, remote-style toggles). */
@Entity('utility_preferences')
export class UtilityPreference {
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

  @Column({ name: 'period_label', type: 'varchar', length: 32, default: 'Annual' })
  periodLabel: string;

  @Column({ name: 'water_control_on', type: 'boolean', default: true })
  waterControlOn: boolean;

  @Column({ name: 'power_control_on', type: 'boolean', default: true })
  powerControlOn: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
