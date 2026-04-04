import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Community } from '../../communities/entities/community.entity';

@Entity('emergency_contacts')
export class EmergencyContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'community_id', type: 'uuid', nullable: true })
  communityId: string | null;

  @ManyToOne(() => Community, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'community_id' })
  community: Community | null;

  @Column({ length: 160 })
  label: string;

  @Column({ length: 40 })
  phone: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}
