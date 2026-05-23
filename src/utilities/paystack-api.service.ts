import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const PAYSTACK_BASE = 'https://api.paystack.co';

@Injectable()
export class PaystackApiService {
  constructor(private readonly config: ConfigService) {}

  private secretKey(): string {
    const s = this.config.get<string>('PAYSTACK_SECRET_KEY');
    const v = s?.trim();
    if (!v) {
      throw new ServiceUnavailableException(
        'Paystack is not configured (set PAYSTACK_SECRET_KEY on the server).',
      );
    }
    return v;
  }

  async initializeTransaction(params: {
    email: string;
    amountKobo: number;
    reference: string;
    metadata: Record<string, string>;
    callbackUrl?: string;
  }): Promise<{ authorizationUrl: string; accessCode: string; reference: string }> {
    /** Paystack expects amount in the smallest currency unit; string is safest across gateways. */
    const body: Record<string, unknown> = {
      email: params.email,
      amount: String(Math.round(params.amountKobo)),
      reference: params.reference,
      metadata: JSON.stringify(params.metadata),
      currency: 'NGN',
    };
    if (params.callbackUrl) {
      body.callback_url = params.callbackUrl;
    }
    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    let json: {
      status?: boolean;
      message?: string;
      data?: {
        authorization_url: string;
        access_code: string;
        reference: string;
      };
    };
    try {
      json = JSON.parse(raw) as {
        status?: boolean;
        message?: string;
        data?: {
          authorization_url: string;
          access_code: string;
          reference: string;
        };
      };
    } catch {
      throw new BadRequestException(
        'Invalid response from Paystack. Check PAYSTACK_SECRET_KEY and network access.',
      );
    }
    if (!res.ok && !json.status) {
      throw new BadRequestException(
        json.message || `Paystack initialize failed (HTTP ${res.status}).`,
      );
    }
    if (!json.status || !json.data?.authorization_url) {
      throw new BadRequestException(
        json.message || 'Could not start Paystack checkout.',
      );
    }
    return {
      authorizationUrl: json.data.authorization_url,
      accessCode: json.data.access_code,
      reference: json.data.reference,
    };
  }

  /** Returns Paystack transaction payload when reference is valid. */
  async verifyTransaction(reference: string): Promise<{
    status: string;
    amount: number;
    currency: string;
    paidAt: string | null;
    metadata: Record<string, unknown> | null;
  }> {
    const res = await fetch(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${this.secretKey()}` },
      },
    );
    const raw = await res.text();
    let json: {
      status?: boolean;
      message?: string;
      data?: {
        status: string;
        amount: number | string;
        currency: string;
        paid_at?: string | null;
        metadata: Record<string, unknown> | string | null;
      };
    };
    try {
      json = JSON.parse(raw) as {
        status?: boolean;
        message?: string;
        data?: {
          status: string;
          amount: number | string;
          currency: string;
          paid_at?: string | null;
          metadata: Record<string, unknown> | string | null;
        };
      };
    } catch {
      throw new BadRequestException(
        'Invalid response from Paystack when verifying. Try again in a moment.',
      );
    }
    if (!res.ok && !json.status) {
      throw new BadRequestException(
        json.message || `Paystack verify failed (HTTP ${res.status}).`,
      );
    }
    if (!json.status || !json.data) {
      throw new BadRequestException(
        json.message || 'Could not verify Paystack transaction.',
      );
    }
    let metadata: Record<string, unknown> | null = null;
    const metaRaw = json.data.metadata;
    if (metaRaw != null) {
      if (typeof metaRaw === 'string') {
        try {
          metadata = JSON.parse(metaRaw) as Record<string, unknown>;
        } catch {
          metadata = null;
        }
      } else {
        metadata = metaRaw;
      }
    }
    const amt = json.data.amount;
    const amountNum = typeof amt === 'string' ? Number(amt) : Number(amt);
    const d = json.data as Record<string, unknown>;
    const paidAtRaw = d['paid_at'] ?? d['paidAt'];
    const paidAt =
      typeof paidAtRaw === 'string' && paidAtRaw.trim() !== ''
        ? paidAtRaw
        : null;
    return {
      status: json.data.status,
      amount: Number.isFinite(amountNum) ? amountNum : 0,
      currency: (json.data.currency ?? 'NGN').toUpperCase(),
      paidAt,
      metadata,
    };
  }
}
