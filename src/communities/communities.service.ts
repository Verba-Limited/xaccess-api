import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Community } from './entities/community.entity';
import { CreateCommunityDto } from './dto/create-community.dto';

@Injectable()
export class CommunitiesService {
  constructor(
    @InjectRepository(Community)
    private readonly repo: Repository<Community>,
  ) {}

  async create(dto: CreateCommunityDto): Promise<Community> {
    const exists = await this.repo.findOne({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('Slug already taken');
    const c = this.repo.create({
      name: dto.name,
      slug: dto.slug.toLowerCase(),
      address: dto.address ?? null,
      isActive: true,
    });
    return this.repo.save(c);
  }

  findAll(): Promise<Community[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  /** Minimal fields for signup dropdowns (no auth). */
  listPublicForRegistration(): Promise<
    Pick<Community, 'id' | 'name' | 'slug'>[]
  > {
    return this.repo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
      select: ['id', 'name', 'slug'],
    });
  }

  async findById(id: string): Promise<Community> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Community not found');
    return c;
  }

  async findBySlug(slug: string): Promise<Community | null> {
    return this.repo.findOne({
      where: { slug: slug.trim().toLowerCase() },
    });
  }

  async setActive(id: string, isActive: boolean): Promise<Community> {
    const c = await this.findById(id);
    c.isActive = isActive;
    return this.repo.save(c);
  }

  summaryForCommunity(communityId: string) {
    return this.repo
      .createQueryBuilder('c')
      .where('c.id = :id', { id: communityId })
      .getOne();
  }
}
