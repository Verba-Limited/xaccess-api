import { Controller, Get, Query } from '@nestjs/common';
import { EmergencyContactsService } from './emergency-contacts.service';

/** Unauthenticated ICE list for mobile (optional community filter). */
@Controller({ path: 'public/emergency-contacts', version: '1' })
export class PublicEmergencyController {
  constructor(private readonly emergency: EmergencyContactsService) {}

  @Get()
  list(@Query('communityId') communityId?: string) {
    return this.emergency.listForCommunity(communityId ?? null);
  }
}
