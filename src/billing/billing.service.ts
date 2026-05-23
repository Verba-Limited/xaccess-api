import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Invoice, type InvoiceStatus } from './entities/invoice.entity';
import { User, UserRole } from '../users/entities/user.entity';
import type { CreateCommunityChargesDto } from './dto/create-community-charges.dto';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Invoice)
    private readonly repo: Repository<Invoice>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private todayUtcDateOnly(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** Mark past-due pending invoices as OVERDUE for the community. */
  async markOverdueInvoices(communityId: string): Promise<void> {
    const today = this.todayUtcDateOnly();
    await this.repo
      .createQueryBuilder()
      .update(Invoice)
      .set({ status: 'OVERDUE' })
      .where('community_id = :cid', { cid: communityId })
      .andWhere('status = :st', { st: 'PENDING' })
      .andWhere('due_date < :today', { today })
      .execute();
  }

  private initialStatusForDueDate(dueDate: string): InvoiceStatus {
    return dueDate < this.todayUtcDateOnly() ? 'OVERDUE' : 'PENDING';
  }

  async summary(userId: string, communityId: string) {
    await this.markOverdueInvoices(communityId);
    const pending = await this.repo
      .createQueryBuilder('i')
      .where('i.user_id = :uid', { uid: userId })
      .andWhere('i.community_id = :cid', { cid: communityId })
      .andWhere('i.status IN (:...st)', { st: ['PENDING', 'OVERDUE'] })
      .getMany();
    const totalMinor = pending.reduce((s, p) => s + p.amountMinor, 0);
    const nextDue = pending.map((p) => p.dueDate).sort().at(0);
    const nextInv =
      pending.find((p) => p.dueDate === nextDue) ?? pending[0] ?? null;
    return {
      hasOutstanding: pending.length > 0,
      totalAmountMinor: totalMinor,
      currency: pending[0]?.currency ?? 'NGN',
      nextDueDate: nextDue ?? null,
      nextInvoiceId: nextInv?.id ?? null,
    };
  }

  async listForUser(userId: string, communityId: string): Promise<Invoice[]> {
    await this.markOverdueInvoices(communityId);
    return this.repo.find({
      where: { userId, communityId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getOne(id: string, userId: string, communityId: string): Promise<Invoice | null> {
    await this.markOverdueInvoices(communityId);
    return this.repo.findOne({
      where: { id, userId, communityId },
    });
  }

  async recordPayment(
    invoiceId: string,
    userId: string,
    communityId: string,
    _paymentMethod?: string,
  ): Promise<Invoice> {
    await this.markOverdueInvoices(communityId);
    const inv = await this.repo.findOne({
      where: { id: invoiceId, userId, communityId },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status === 'PAID') {
      return inv;
    }
    inv.status = 'PAID';
    inv.paidAt = new Date();
    return this.repo.save(inv);
  }

  /** Facility admin: all invoices in the community with resident info. */
  async listForCommunityAdmin(communityId: string) {
    await this.markOverdueInvoices(communityId);
    const rows = await this.repo.find({
      where: { communityId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 500,
    });

    return rows.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      title: i.title,
      amountMinor: i.amountMinor,
      currency: i.currency,
      status: i.status,
      dueDate: i.dueDate,
      paidAt: i.paidAt ? i.paidAt.toISOString() : null,
      createdAt: i.createdAt.toISOString(),
      residentName: i.user?.fullName ?? '—',
      residentEmail: i.user?.email ?? null,
      unitLabel: i.user?.unitLabel ?? null,
    }));
  }

  /**
   * Create the same charge (title, amount, due date) for each selected resident.
   */
  async createChargesForResidents(
    communityId: string,
    dto: CreateCommunityChargesDto,
  ) {
    await this.markOverdueInvoices(communityId);
    const uniqueIds = [...new Set(dto.residentIds)];
    const users = await this.userRepo.find({
      where: {
        id: In(uniqueIds),
        communityId,
        role: UserRole.RESIDENT,
        isActive: true,
      },
    });
    if (users.length !== uniqueIds.length) {
      throw new BadRequestException(
        'One or more residents are invalid, inactive, or not in this facility.',
      );
    }
    const currency = (dto.currency ?? 'NGN').toUpperCase().slice(0, 8);
    const amountMinor = Math.round(dto.amountMinor);
    const status = this.initialStatusForDueDate(dto.dueDate);
    const rows = uniqueIds.map((userId) =>
      this.repo.create({
        userId,
        communityId,
        invoiceNumber: `INV-${randomUUID().replace(/-/g, '').slice(0, 14).toUpperCase()}`,
        title: dto.title.trim(),
        amountMinor,
        currency,
        status,
        dueDate: dto.dueDate,
        paidAt: null,
      }),
    );
    const saved = await this.repo.save(rows);
    return {
      created: saved.length,
      invoices: saved.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        title: i.title,
        amountMinor: i.amountMinor,
        currency: i.currency,
        status: i.status,
        dueDate: i.dueDate,
        userId: i.userId,
      })),
    };
  }
}
