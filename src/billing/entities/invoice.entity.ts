import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Community } from '../../communities/entities/community.entity';
import { User } from '../../users/entities/user.entity';

export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE';

@Entity('invoices')
export class Invoice {
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

  @Column({ length: 40 })
  invoiceNumber: string;

  @Column({ length: 200 })
  title: string;

  /** Amount in minor units (e.g. kobo) */
  @Column({ name: 'amount_minor', type: 'int' })
  amountMinor: number;

  @Column({ length: 8, default: 'NGN' })
  currency: string;

  @Column({ type: 'varchar', length: 20 })
  status: InvoiceStatus;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
