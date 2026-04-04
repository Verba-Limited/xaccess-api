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
import { AccessToken } from './access-token.entity';

export enum AccessLogAction {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
  DENIED = 'DENIED',
}

export enum CredentialType {
  QR = 'QR',
  PASSWORD = 'PASSWORD',
  RFID = 'RFID',
}

@Entity('access_logs')
export class AccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'community_id', type: 'uuid' })
  communityId: string;

  @ManyToOne(() => Community, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'community_id' })
  community: Community;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'access_token_id', type: 'uuid', nullable: true })
  accessTokenId: string | null;

  @ManyToOne(() => AccessToken, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'access_token_id' })
  accessToken: AccessToken | null;

  @Column({ name: 'device_id', type: 'uuid', nullable: true })
  deviceId: string | null;

  @Column({ type: 'varchar', length: 32 })
  action: AccessLogAction;

  @Column({ name: 'credential_type', type: 'varchar', length: 32, nullable: true })
  credentialType: CredentialType | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
