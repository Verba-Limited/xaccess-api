import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Community } from '../communities/entities/community.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { EmergencyContact } from '../emergency/entities/emergency-contact.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { UtilityUsage } from '../utilities/entities/utility-usage.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Community)
    private readonly communities: Repository<Community>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(EmergencyContact)
    private readonly emergency: Repository<EmergencyContact>,
    @InjectRepository(Invoice)
    private readonly invoices: Repository<Invoice>,
    @InjectRepository(UtilityUsage)
    private readonly utilityUsage: Repository<UtilityUsage>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  private async seed() {
    const count = await this.communities.count();
    if (count > 0) {
      this.logger.log('Database already seeded, skipping.');
      return;
    }

    const community = this.communities.create({
      name: 'Harmony Estate',
      slug: 'harmony-estate',
      address: 'Demo address',
      isActive: true,
    });
    await this.communities.save(community);

    const hash = async (p: string) => bcrypt.hash(p, 10);

    const superAdmin = this.users.create({
      email: 'superadmin@xaccess.local',
      passwordHash: await hash('SuperAdmin123!'),
      fullName: 'Platform Super Admin',
      role: UserRole.SUPER_ADMIN,
      communityId: null,
      isActive: true,
    });
    await this.users.save(superAdmin);

    const estateAdmin = this.users.create({
      email: 'estate.admin@xaccess.local',
      passwordHash: await hash('EstateAdmin123!'),
      fullName: 'Estate Manager',
      role: UserRole.COMMUNITY_ADMIN,
      communityId: community.id,
      isActive: true,
    });
    await this.users.save(estateAdmin);

    const resident = this.users.create({
      email: 'resident@xaccess.local',
      passwordHash: await hash('Resident123!'),
      fullName: 'John Resident',
      role: UserRole.RESIDENT,
      communityId: community.id,
      phone: '+234 800 000 0000',
      unitLabel: 'Block 10, Flat 12',
      isActive: true,
    });
    await this.users.save(resident);

    await this.emergency.save([
      this.emergency.create({
        communityId: null,
        label: 'Emergency (112)',
        phone: '112',
        sortOrder: 0,
      }),
      this.emergency.create({
        communityId: community.id,
        label: 'Estate Security',
        phone: '08033011052',
        sortOrder: 1,
      }),
    ]);

    await this.invoices.save(
      this.invoices.create({
        userId: resident.id,
        communityId: community.id,
        invoiceNumber: 'INV-001',
        title: 'Electricity Charge',
        amountMinor: 200000,
        currency: 'NGN',
        status: 'PENDING',
        dueDate: '2026-06-30',
        paidAt: null,
      }),
    );

    const months = ['2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'];
    let p = 70;
    let w = 50;
    for (const ym of months) {
      await this.utilityUsage.save(
        this.utilityUsage.create({
          userId: resident.id,
          communityId: community.id,
          yearMonth: ym,
          electricityKwh: p,
          waterM3: w,
        }),
      );
      p = Math.min(95, p + (Math.random() % 2 === 0 ? 3 : -2));
      w = Math.min(90, w + (Math.random() % 2 === 0 ? 4 : -3));
    }

    this.logger.log(
      'Seeded demo users: superadmin@xaccess.local / SuperAdmin123! | estate.admin@xaccess.local / EstateAdmin123! | resident@xaccess.local / Resident123!',
    );
  }
}
