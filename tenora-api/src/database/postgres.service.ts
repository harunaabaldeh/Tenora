import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import type { AppConfig } from '../config/configuration';

@Injectable()
export class PostgresService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostgresService.name);
  private readonly pool: Pool;
  private readonly nodeEnv: AppConfig['nodeEnv'];

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    const database = this.configService.get('database', { infer: true });
    this.nodeEnv = this.configService.get('nodeEnv', { infer: true });

    this.pool = new Pool({
      host: database.host,
      port: database.port,
      database: database.name,
      user: database.user,
      password: database.password,
      max: database.poolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: database.ssl ? { rejectUnauthorized: true } : undefined,
      application_name: 'tenora-api',
    });

    this.pool.on('error', (error: Error) => {
      this.logger.error(`Unexpected idle client error: ${error.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    if (this.nodeEnv === 'test') {
      return;
    }

    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      this.logger.log('Connected to PostgreSQL');
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, values);
  }
}
