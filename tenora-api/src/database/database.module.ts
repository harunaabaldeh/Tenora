import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { AppConfig } from '../config/configuration';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const database = configService.get('database', { infer: true });
        const nodeEnv = configService.get('nodeEnv', { infer: true });

        return {
          type: 'postgres' as const,
          host: database.host,
          port: database.port,
          username: database.user,
          password: database.password,
          database: database.name,
          ssl: database.ssl ? { rejectUnauthorized: true } : false,
          extra: {
            max: database.poolMax,
            application_name: 'tenora-api',
          },
          autoLoadEntities: true,
          synchronize: false,
          migrationsRun: false,
          logging: nodeEnv === 'development',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
