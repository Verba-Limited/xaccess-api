import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Community } from '../../communities/entities/community.entity';

export enum AccessTokenType {
  TEMPORARY = 'TEMPORARY',
  PERMANENT = 'PERMANENT',
  EVENT = 'EVENT',
}

export enum AccessTokenStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

/** JSON: { qr: boolean; password: boolean; rfid: boolean } */
export interface AccessMethods {
  qr: boolean;
  password: boolean;
  rfid: boolean;
}

@Entity('access_tokens')
export class AccessToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resident_id', type: 'uuid' })
  residentId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resident_id' })
  resident: User;

  @Column({ name: 'community_id', type: 'uuid' })
  communityId: string;

  @ManyToOne(() => Community, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'community_id' })
  community: Community;

  @Column({ type: 'varchar', length: 32 })
  type: AccessTokenType;

  /** SHA-256 hex of the secret token string (never store plain) */
  @Column({ name: 'token_digest', length: 64 })
  tokenDigest: string;

  @Column({ type: 'simple-json' })
  methods: AccessMethods;

  @Column({ name: 'guest_name', type: 'varchar', length: 255, nullable: true })
  guestName: string | null;

  @Column({ name: 'valid_from', type: 'timestamp', nullable: true })
  validFrom: Date | null;

  @Column({ name: 'valid_to', type: 'timestamp', nullable: true })
  validTo: Date | null;

  @Column({ type: 'varchar', length: 32, default: AccessTokenStatus.ACTIVE })
  status: AccessTokenStatus;

  /** bcrypt hash of optional keypad password if methods.password */
  @Column({ name: 'keypad_password_hash', type: 'varchar', length: 255, nullable: true })
  keypadPasswordHash: string | null;

  /**
   * The plain numeric PIN value (parseInt of the 6-digit code) used to sync
   * the password to physical devices via the WebSocket SDK protocol.
   * Stored as uint because the device accepts only numeric passwords and we
   * need to re-push it when the device reconnects after offline periods.
   */
  @Column({ name: 'device_password_value', type: 'integer', nullable: true })
  devicePasswordValue: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
