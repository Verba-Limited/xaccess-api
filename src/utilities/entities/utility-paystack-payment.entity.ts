import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('utility_paystack_payments')
export class UtilityPaystackPayment {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  reference: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index()
  @Column({ name: 'community_id', type: 'uuid' })
  communityId: string;

  /** Amount sent to Paystack (NGN kobo / minor units). */
  @Column({ name: 'amount_kobo', type: 'int' })
  amountKobo: number;

  @Column({ type: 'varchar', length: 24, default: 'pending' })
  status: 'pending' | 'applied';

  @Column({ name: 'applied_at', type: 'timestamp', nullable: true })
  appliedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
