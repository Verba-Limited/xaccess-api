import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Render / load-balancer health probe.
 * Path: GET /api/v1/health
 */
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    await this.dataSource.query('SELECT 1');
    return {
      status: 'ok',
      service: 'xaccess-api',
      database: this.dataSource.options.type,
    };
  }
}
