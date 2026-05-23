import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { User } from '../users/entities/user.entity';
import { UtilityPaystackPayment } from './entities/utility-paystack-payment.entity';
import { PaystackApiService } from './paystack-api.service';
import { flattenPaystackMetadata } from './paystack-metadata.util';
import { UtilitiesSubscriptionService } from './utilities-subscription.service';

@Injectable()
export class UtilityPaystackService {
  constructor(
    @InjectRepository(UtilityPaystackPayment)
    private readonly paymentRepo: Repository<UtilityPaystackPayment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly paystackApi: PaystackApiService,
    private readonly subscriptions: UtilitiesSubscriptionService,
  ) {}

  async initializeUtilityPayment(userId: string, communityId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.email?.trim()) {
      throw new BadRequestException(
        'Your account needs an email address to pay with Paystack.',
      );
    }
    const sub = await this.subscriptions.getResidentSubscription(
      userId,
      communityId,
    );
    if (sub.paidForPeriod) {
      throw new BadRequestException('This billing period is already paid.');
    }
    if (sub.currency !== 'NGN') {
      throw new BadRequestException(
        'Paystack checkout is available for NGN service charges only.',
      );
    }
    const amountKobo = Math.round(sub.serviceChargeMinor);
    if (amountKobo < 100) {
      throw new BadRequestException(
        'Service charge is below the minimum amount for card payments.',
      );
    }
    const reference = randomUUID();
    await this.paymentRepo.save(
      this.paymentRepo.create({
        reference,
        userId,
        communityId,
        amountKobo,
        status: 'pending',
      }),
    );
    const callbackUrl = process.env.PAYSTACK_CALLBACK_URL?.trim();
    const init = await this.paystackApi.initializeTransaction({
      email: user.email.trim().toLowerCase(),
      amountKobo,
      reference,
      metadata: {
        userId,
        communityId,
        purpose: 'utility_subscription',
      },
      callbackUrl: callbackUrl || undefined,
    });
    return {
      authorizationUrl: init.authorizationUrl,
      reference: init.reference,
      amountKobo,
      currency: 'NGN' as const,
    };
  }

  async verifyAndApplyUtilityPayment(
    userId: string,
    communityId: string,
    reference: string,
  ) {
    const row = await this.paymentRepo.findOne({
      where: { reference, userId, communityId },
    });
    if (!row) {
      throw new NotFoundException('No Paystack session found for this reference.');
    }
    if (row.status === 'applied') {
      return this.subscriptions.getResidentSubscription(userId, communityId);
    }
    const data = await this.paystackApi.verifyTransaction(reference);
    if (String(data.status).toLowerCase() !== 'success') {
      throw new BadRequestException(
        'Payment is not complete on Paystack yet. Open checkout, pay with card or bank, then tap Confirm again.',
      );
    }
    /** Initialized-but-unpaid transactions can report status "success" in edge cases; paid_at is authoritative. */
    if (!data.paidAt || String(data.paidAt).trim() === '') {
      throw new BadRequestException(
        'Paystack has not recorded a completed payment. Finish checkout in the browser, then tap Confirm again.',
      );
    }
    const paidKobo = Number(data.amount);
    if (data.currency !== 'NGN' || paidKobo !== row.amountKobo) {
      throw new BadRequestException('Payment amount does not match this bill.');
    }
    const flat = flattenPaystackMetadata(data.metadata);
    if (
      String(flat['userId'] ?? '') !== userId ||
      String(flat['communityId'] ?? '') !== communityId
    ) {
      throw new ForbiddenException('Payment does not belong to this account.');
    }

    const latest = await this.paymentRepo.findOne({
      where: { reference, userId, communityId },
    });
    if (!latest || latest.status === 'applied') {
      return this.subscriptions.getResidentSubscription(userId, communityId);
    }

    await this.subscriptions.payCurrentPeriod(userId, communityId);

    const upd = await this.paymentRepo.update(
      { reference, userId, communityId, status: 'pending' },
      { status: 'applied', appliedAt: new Date() },
    );
    if (!upd.affected) {
      return this.subscriptions.getResidentSubscription(userId, communityId);
    }

    return this.subscriptions.getResidentSubscription(userId, communityId);
  }
}
