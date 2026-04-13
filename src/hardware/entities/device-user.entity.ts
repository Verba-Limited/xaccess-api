import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AccessToken } from '../../access/entities/access-token.entity';

/**
 * Maps a physical device's integer enrollId to an AccessToken UUID.
 * The passwordValue field stores the numeric PIN in cleartext so we can
 * re-sync to the device when it reconnects after being offline.
 */
@Entity('device_users')
@Index(['deviceSerialNumber', 'enrollId'], { unique: true })
export class DeviceUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Device serial number from the reg handshake */
  @Column({ name: 'device_serial_number', length: 64 })
  deviceSerialNumber: string;

  /** Integer slot on the device (1-based, per device) */
  @Column({ name: 'enroll_id', type: 'integer' })
  enrollId: number;

  /** The AccessToken this device slot represents */
  @Column({ name: 'access_token_id', type: 'uuid' })
  accessTokenId: string;

  @ManyToOne(() => AccessToken, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'access_token_id' })
  accessToken: AccessToken;

  @Column({ name: 'community_id', type: 'uuid' })
  communityId: string;

  /**
   * The 6-digit numeric PIN stored as uint (same as the plain access token code).
   * Kept in cleartext because the device stores it in cleartext too and we need
   * to re-push it when the device reconnects after offline periods.
   */
  @Column({ name: 'password_value', type: 'integer' })
  passwordValue: number;

  /** Guest name displayed on the device screen */
  @Column({ name: 'guest_name', type: 'varchar', length: 255, nullable: true })
  guestName: string | null;

  /** Null = not yet synced to device; set when setuserinfo was acknowledged */
  @Column({ name: 'synced_at', type: 'datetime', nullable: true })
  syncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
