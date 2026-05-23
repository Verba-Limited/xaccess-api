import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as WebSocket from 'ws';
import { DeviceUser } from './entities/device-user.entity';
import { HardwareDevicesService } from './hardware-devices.service';
import { AccessTokensService } from '../access/access-tokens.service';
import {
  AccessLogAction,
  CredentialType,
} from '../access/entities/access-log.entity';
import { AccessTokenStatus } from '../access/entities/access-token.entity';

/** In-memory session entry per connected device */
interface DeviceSession {
  ws: WebSocket;
  communityId: string;
  deviceId: string;
  deviceName: string;
}

/** Shape of the sendlog record from the device SDK */
interface SendlogRecord {
  enrollid: number;
  time: string;
  mode: number;
  inout: number;
  event: number;
  image?: string;
}

@Injectable()
export class DeviceSocketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeviceSocketService.name);
  private wss?: WebSocket.Server;

  /** SN → active WebSocket session */
  private deviceSessions = new Map<string, DeviceSession>();

  constructor(
    @InjectRepository(DeviceUser)
    private readonly deviceUserRepo: Repository<DeviceUser>,
    private readonly devicesService: HardwareDevicesService,
    @Inject(forwardRef(() => AccessTokensService))
    private readonly accessTokensService: AccessTokensService,
  ) {}

  onModuleInit() {
    if (process.env.DISABLE_DEVICE_WS === 'true') {
      this.logger.warn(
        'Device WebSocket server disabled (DISABLE_DEVICE_WS=true)',
      );
      return;
    }
    const port = Number(process.env.DEVICE_WS_PORT ?? 7788);
    this.wss = new WebSocket.Server({ port });
    this.wss.on('connection', (ws: WebSocket) => this.handleConnection(ws));
    this.logger.log(`Device WebSocket server listening on port ${port}`);
  }

  onModuleDestroy() {
    this.wss?.close();
  }

  // ---------------------------------------------------------------------------
  // Public API — called by AccessTokensService / HardwareController
  // ---------------------------------------------------------------------------

  /** Returns SN list of all currently-connected devices */
  getConnectedSerialNumbers(): string[] {
    return [...this.deviceSessions.keys()];
  }

  isDeviceConnected(serialNumber: string): boolean {
    return this.deviceSessions.has(serialNumber);
  }

  /**
   * Push a password-based token to every device in the community.
   * Creates a DeviceUser record for tracking. If a device is offline the
   * DeviceUser row is kept with syncedAt=null; it will be pushed on next reg.
   */
  async syncTokenToAllCommunityDevices(
    communityId: string,
    accessTokenId: string,
    guestName: string | null,
    passwordValue: number,
  ): Promise<void> {
    // Find all devices for this community that are registered with a SN
    const deviceRows = await this.devicesService.listByCommunityWithSn(communityId);

    for (const device of deviceRows) {
      if (!device.serialNumber) continue;
      await this.syncTokenToDevice(
        device.serialNumber,
        device.id,
        communityId,
        accessTokenId,
        guestName,
        passwordValue,
      );
    }
  }

  /**
   * Remove a token from every device in the community (on revoke / expire).
   */
  async removeTokenFromAllCommunityDevices(
    communityId: string,
    accessTokenId: string,
  ): Promise<void> {
    const rows = await this.deviceUserRepo.find({
      where: { communityId, accessTokenId },
    });
    for (const row of rows) {
      this.removeUserFromDevice(row.deviceSerialNumber, row.enrollId);
      await this.deviceUserRepo.remove(row);
    }
  }

  // ---------------------------------------------------------------------------
  // WebSocket connection handling
  // ---------------------------------------------------------------------------

  private handleConnection(ws: WebSocket) {
    this.logger.debug('New device connection');

    ws.on('message', (data: WebSocket.RawData) => {
      const raw = data.toString();
      this.logger.debug(`Received: ${raw.slice(0, 200)}`);
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        this.logger.warn('Received non-JSON message from device');
        return;
      }
      void this.handleMessage(ws, msg);
    });

    ws.on('close', () => {
      // Remove from session map
      for (const [sn, session] of this.deviceSessions.entries()) {
        if (session.ws === ws) {
          this.deviceSessions.delete(sn);
          this.logger.log(`Device disconnected: ${sn}`);
          break;
        }
      }
    });

    ws.on('error', (err) => {
      this.logger.error(`Device WebSocket error: ${err.message}`);
    });
  }

  private async handleMessage(
    ws: WebSocket,
    msg: Record<string, unknown>,
  ): Promise<void> {
    const cmd = msg['cmd'] as string | undefined;
    const ret = msg['ret'] as string | undefined;

    if (cmd) {
      switch (cmd) {
        case 'reg':
          await this.handleReg(ws, msg);
          break;
        case 'sendlog':
          await this.handleSendlog(ws, msg);
          break;
        case 'senduser':
          this.handleSenduser(ws, msg);
          break;
        default:
          this.logger.debug(`Unhandled cmd: ${cmd}`);
      }
    } else if (ret) {
      // Responses to commands we sent (setuserinfo ack, deleteuser ack, etc.)
      this.handleRetMessage(ws, msg, ret);
    }
  }

  // ---------------------------------------------------------------------------
  // cmd: reg — device connects and identifies itself
  // ---------------------------------------------------------------------------

  private async handleReg(ws: WebSocket, msg: Record<string, unknown>): Promise<void> {
    const sn = msg['sn'] as string;
    if (!sn) {
      this.send(ws, { ret: 'reg', result: false, reason: 'Missing sn' });
      return;
    }

    const cloudtime = new Date().toISOString();
    let device = await this.devicesService.findBySerialNumber(sn);

    if (!device) {
      // Device not pre-registered — accept connection but we won't sync tokens
      this.logger.warn(`Device SN ${sn} connected but not found in DB`);
      this.deviceSessions.set(sn, {
        ws,
        communityId: '',
        deviceId: '',
        deviceName: sn,
      });
      this.send(ws, { ret: 'reg', result: true, cloudtime });
      return;
    }

    // Update last seen
    await this.devicesService.touch(device.id);

    this.deviceSessions.set(sn, {
      ws,
      communityId: device.communityId,
      deviceId: device.id,
      deviceName: device.name,
    });

    this.logger.log(`Device registered: ${sn} (${device.name}, community ${device.communityId})`);
    this.send(ws, { ret: 'reg', result: true, cloudtime });

    // Push any pending (not yet synced) tokens to the device
    await this.pushPendingTokens(sn, device.communityId);
  }

  // ---------------------------------------------------------------------------
  // cmd: sendlog — device sends access event records
  // ---------------------------------------------------------------------------

  private async handleSendlog(ws: WebSocket, msg: Record<string, unknown>): Promise<void> {
    const session = this.getSessionByWs(ws);
    const cloudtime = new Date().toISOString();

    if (!session || !session.communityId) {
      this.send(ws, { ret: 'sendlog', result: true, access: 0, cloudtime });
      return;
    }

    const records = (msg['record'] as SendlogRecord[] | undefined) ?? [];
    let access = 1; // default allow (device already granted locally)

    for (const record of records) {
      const granted = await this.processLogRecord(record, session);
      if (!granted) access = 0;
    }

    this.send(ws, {
      ret: 'sendlog',
      result: true,
      access,
      cloudtime,
      message: access === 1 ? 'Access granted' : 'Access denied',
    });
  }

  private async processLogRecord(
    record: SendlogRecord,
    session: DeviceSession,
  ): Promise<boolean> {
    // Look up the DeviceUser by enrollId + device SN
    const sn = this.getSnBySession(session);
    if (!sn) return false;

    const deviceUser = await this.deviceUserRepo.findOne({
      where: { deviceSerialNumber: sn, enrollId: record.enrollid },
    });

    if (!deviceUser) {
      this.logger.warn(
        `sendlog: no DeviceUser for enrollId=${record.enrollid} sn=${sn}`,
      );
      await this.accessTokensService.logAccess({
        communityId: session.communityId,
        deviceId: session.deviceId || null,
        action: AccessLogAction.DENIED,
        credentialType: CredentialType.PASSWORD,
        metadata: { reason: 'UNKNOWN_ENROLLID', enrollid: record.enrollid, mode: record.mode },
      });
      return false;
    }

    // Validate the token is still active
    const token = await this.accessTokensService.findByTokenId(deviceUser.accessTokenId);
    if (!token) {
      await this.accessTokensService.logAccess({
        communityId: session.communityId,
        userId: undefined,
        accessTokenId: deviceUser.accessTokenId,
        deviceId: session.deviceId || null,
        action: AccessLogAction.DENIED,
        credentialType: CredentialType.PASSWORD,
        metadata: { reason: 'TOKEN_NOT_FOUND', enrollid: record.enrollid },
      });
      return false;
    }

    const isValid = this.accessTokensService.validateTokenWindow(token);
    const action = isValid
      ? record.inout === 0
        ? AccessLogAction.ENTRY
        : AccessLogAction.EXIT
      : AccessLogAction.DENIED;

    await this.accessTokensService.logAccess({
      communityId: session.communityId,
      userId: token.residentId,
      accessTokenId: token.id,
      deviceId: session.deviceId || null,
      action,
      credentialType: CredentialType.PASSWORD,
      metadata: {
        enrollid: record.enrollid,
        mode: record.mode,
        inout: record.inout,
        deviceTime: record.time,
        source: 'DEVICE_WEBSOCKET',
        offline: true, // could have been buffered offline
      },
    });

    if (!isValid) {
      this.logger.warn(
        `sendlog: token ${token.id} inactive/expired, access denied for enrollId=${record.enrollid}`,
      );
      // Clean up stale device user
      void this.removeUserFromDevice(sn, record.enrollid);
      return false;
    }

    this.logger.log(
      `Access ${action}: enrollId=${record.enrollid}, token=${token.id.slice(0, 8)}, mode=${record.mode}`,
    );
    return true;
  }

  // ---------------------------------------------------------------------------
  // cmd: senduser — device pushes enrolled user data (we store it for reference)
  // ---------------------------------------------------------------------------

  private handleSenduser(ws: WebSocket, msg: Record<string, unknown>): void {
    const enrollid = msg['enrollid'] as number;
    const backupnum = msg['backupnum'] as number;
    this.logger.debug(`senduser: enrollid=${enrollid}, backupnum=${backupnum}`);
    this.send(ws, { ret: 'senduser', result: true, enrollid, backupnum });
  }

  // ---------------------------------------------------------------------------
  // ret: responses from commands we sent
  // ---------------------------------------------------------------------------

  private handleRetMessage(
    ws: WebSocket,
    msg: Record<string, unknown>,
    ret: string,
  ): void {
    if (ret === 'setuserinfo') {
      const result = msg['result'] as boolean;
      const enrollid = msg['enrollid'] as number;
      if (result) {
        const sn = this.getSnByWs(ws);
        if (sn) {
          // Mark as synced
          void this.deviceUserRepo.update(
            { deviceSerialNumber: sn, enrollId: enrollid },
            { syncedAt: new Date() },
          );
          this.logger.debug(`setuserinfo ack: enrollId=${enrollid} sn=${sn}`);
        }
      }
    } else if (ret === 'deleteuser') {
      const enrollid = msg['enrollid'] as number;
      this.logger.debug(`deleteuser ack: enrollId=${enrollid}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Device push commands
  // ---------------------------------------------------------------------------

  /**
   * Push a password (backupnum=11) credential to the device.
   * Returns true if sent, false if device is offline.
   */
  pushUserToDevice(
    sn: string,
    enrollId: number,
    name: string,
    passwordValue: number,
  ): boolean {
    const session = this.deviceSessions.get(sn);
    if (!session) return false;

    this.send(session.ws, {
      cmd: 'setuserinfo',
      enrollid: enrollId,
      name,
      admin: 0,
      backupnum: 11, // password type
      record: passwordValue,
    });
    this.logger.log(`Pushed password user enrollId=${enrollId} to device ${sn}`);
    return true;
  }

  /**
   * Delete a user from the device (on token revoke/expire).
   */
  removeUserFromDevice(sn: string, enrollId: number): boolean {
    const session = this.deviceSessions.get(sn);
    if (!session) return false;

    this.send(session.ws, {
      cmd: 'deleteuser',
      enrollid: enrollId,
    });
    this.logger.log(`Deleted enrollId=${enrollId} from device ${sn}`);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Internal sync helpers
  // ---------------------------------------------------------------------------

  private async syncTokenToDevice(
    serialNumber: string,
    deviceId: string,
    communityId: string,
    accessTokenId: string,
    guestName: string | null,
    passwordValue: number,
  ): Promise<void> {
    // Determine next enrollId for this device
    const maxRow = await this.deviceUserRepo
      .createQueryBuilder('du')
      .select('MAX(du.enrollId)', 'max')
      .where('du.deviceSerialNumber = :sn', { sn: serialNumber })
      .getRawOne<{ max: number | null }>();

    const enrollId = (maxRow?.max ?? 0) + 1;

    // Upsert DeviceUser
    let row = await this.deviceUserRepo.findOne({
      where: { deviceSerialNumber: serialNumber, accessTokenId },
    });

    if (!row) {
      row = this.deviceUserRepo.create({
        deviceSerialNumber: serialNumber,
        enrollId,
        accessTokenId,
        communityId,
        passwordValue,
        guestName,
        syncedAt: null,
      });
      row = await this.deviceUserRepo.save(row);
    } else {
      // Token already has a slot; update password (in case it changed)
      await this.deviceUserRepo.update(row.id, { passwordValue, syncedAt: null });
    }

    // Push to device if online
    const pushed = this.pushUserToDevice(
      serialNumber,
      row.enrollId,
      guestName ?? 'Guest',
      passwordValue,
    );
    if (!pushed) {
      this.logger.debug(
        `Device ${serialNumber} offline; token ${accessTokenId} queued for sync`,
      );
    }
  }

  /** Push all DeviceUser rows with syncedAt=null to a just-connected device */
  private async pushPendingTokens(sn: string, communityId: string): Promise<void> {
    const pending = await this.deviceUserRepo.find({
      where: { deviceSerialNumber: sn, syncedAt: IsNull() },
      relations: ['accessToken'],
    });

    // Also push active tokens that were never synced to this specific device
    // (e.g. tokens created while device was offline)
    const allCommunityTokens = await this.deviceUserRepo.find({
      where: { communityId },
      relations: ['accessToken'],
    });

    // Filter to tokens that belong to this device and need syncing
    const toSync = [...pending];
    // Add tokens from the community that have no slot on this device yet
    for (const ct of allCommunityTokens) {
      if (
        ct.deviceSerialNumber !== sn &&
        !toSync.find((p) => p.accessTokenId === ct.accessTokenId)
      ) {
        // This token exists on another device but not this one; sync it too
        await this.syncTokenToDevice(
          sn,
          '', // deviceId not needed here
          communityId,
          ct.accessTokenId,
          ct.guestName,
          ct.passwordValue,
        );
      }
    }

    for (const row of toSync) {
      if (!row.accessToken) continue;
      const isActive = this.accessTokensService.validateTokenWindow(row.accessToken);
      if (!isActive) {
        // Token expired while device was offline; clean up
        this.removeUserFromDevice(sn, row.enrollId);
        await this.deviceUserRepo.remove(row);
        continue;
      }
      this.pushUserToDevice(sn, row.enrollId, row.guestName ?? 'Guest', row.passwordValue);
    }

    if (toSync.length > 0) {
      this.logger.log(
        `Pushed ${toSync.length} pending token(s) to device ${sn}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Utility helpers
  // ---------------------------------------------------------------------------

  private send(ws: WebSocket, payload: Record<string, unknown>): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  private getSnByWs(ws: WebSocket): string | undefined {
    for (const [sn, session] of this.deviceSessions.entries()) {
      if (session.ws === ws) return sn;
    }
    return undefined;
  }

  private getSnBySession(session: DeviceSession): string | undefined {
    for (const [sn, s] of this.deviceSessions.entries()) {
      if (s === session) return sn;
    }
    return undefined;
  }

  private getSessionByWs(ws: WebSocket): DeviceSession | undefined {
    for (const session of this.deviceSessions.values()) {
      if (session.ws === ws) return session;
    }
    return undefined;
  }
}
