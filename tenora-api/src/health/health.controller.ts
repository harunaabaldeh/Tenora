import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PostgresService } from '../database/postgres.service';

@Controller('health')
export class HealthController {
  constructor(private readonly postgres: PostgresService) {}

  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<{ status: 'ok'; checks: { postgres: 'up' } }> {
    return this.checkPostgres();
  }

  @Get()
  async check(): Promise<{ status: 'ok'; checks: { postgres: 'up' } }> {
    return this.checkPostgres();
  }

  private async checkPostgres(): Promise<{
    status: 'ok';
    checks: { postgres: 'up' };
  }> {
    try {
      await this.postgres.query('SELECT 1');
      return { status: 'ok', checks: { postgres: 'up' } };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        checks: { postgres: 'down' },
      });
    }
  }
}
