import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident } from './entities/incident.entity';
import { CreateIncidentDto } from './dto/create-incident.dto';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(Incident)
    private readonly repo: Repository<Incident>,
  ) {}

  async create(dto: CreateIncidentDto, userId: string, communityId: string) {
    const row = this.repo.create({
      userId,
      communityId,
      category: dto.category.trim().toUpperCase(),
      notes: dto.notes?.trim() || null,
    });
    return this.repo.save(row);
  }

  listMine(userId: string, communityId: string): Promise<Incident[]> {
    return this.repo.find({
      where: { userId, communityId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /** Estate manager: all emergency incidents in this community (newest first). */
  async listForCommunityAdmin(communityId: string) {
    const rows = await this.repo.find({
      where: { communityId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 200,
    });

    return rows.map((row) => ({
      id: row.id,
      category: row.category,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      residentId: row.userId,
      residentName: row.user?.fullName ?? '—',
      residentEmail: row.user?.email ?? null,
      unitLabel: row.user?.unitLabel ?? null,
    }));
  }
}
