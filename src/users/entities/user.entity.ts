import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Community } from '../../communities/entities/community.entity';

export enum UserRole {
  RESIDENT = 'RESIDENT',
  COMMUNITY_ADMIN = 'COMMUNITY_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 32 })
  role: UserRole;

  @Column({ name: 'community_id', type: 'uuid', nullable: true })
  communityId: string | null;

  @ManyToOne(() => Community, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'community_id' })
  community: Community | null;

  @Column({ name: 'unit_label', type: 'varchar', length: 255, nullable: true })
  unitLabel: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
