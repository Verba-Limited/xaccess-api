import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmergencyContact } from './entities/emergency-contact.entity';

@Injectable()
export class EmergencyContactsService {
  constructor(
    @InjectRepository(EmergencyContact)
    private readonly repo: Repository<EmergencyContact>,
  ) {}

  /**
   * Global contacts (community_id null) + community-specific, sorted.
   */
  async listForCommunity(communityId: string | null): Promise<EmergencyContact[]> {
    const qb = this.repo
      .createQueryBuilder('e')
      .where('e.community_id IS NULL')
      .orWhere('e.community_id = :cid', { cid: communityId })
      .orderBy('e.sort_order', 'ASC')
      .addOrderBy('e.label', 'ASC');
    return qb.getMany();
  }
}
