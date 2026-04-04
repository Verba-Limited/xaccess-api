import { Controller, Get } from '@nestjs/common';
import { CommunitiesService } from './communities.service';

/**
 * Unauthenticated list for mobile/web registration (active communities only).
 * Path: GET /api/v1/public/communities
 */
@Controller({ path: 'public/communities', version: '1' })
export class PublicCommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Get()
  listForRegistration() {
    return this.communitiesService.listPublicForRegistration();
  }
}
