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

export enum HardwareDeviceType {
  KEYPAD = 'KEYPAD',
  QR_SCANNER = 'QR_SCANNER',
  RFID_READER = 'RFID_READER',
  MULTI_INPUT = 'MULTI_INPUT',
}

@Entity('hardware_devices')
export class HardwareDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'community_id', type: 'uuid' })
  communityId: string;

  @ManyToOne(() => Community, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'community_id' })
  community: Community;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 32 })
  type: HardwareDeviceType;

  /** Secret for API authentication from device */
  @Column({ name: 'api_key', unique: true, length: 64 })
  apiKey: string;

  /**
   * Device serial number (SN) from the WebSocket `reg` handshake.
   * Null until the device connects for the first time.
   */
  @Column({ name: 'serial_number', type: 'varchar', length: 64, nullable: true, unique: true })
  serialNumber: string | null;

  @Column({ name: 'last_seen_at', type: 'timestamp', nullable: true })
  lastSeenAt: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
