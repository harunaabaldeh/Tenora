import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { CreateUsers1725120000002 } from './migrations/1725120000002-CreateUsers';
import { EnablePgcrypto1725120000001 } from './migrations/1725120000001-EnablePgcrypto';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: true }
      : false,
  extra: {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    application_name: 'tenora-api',
  },
  entities: [User],
  migrations: [EnablePgcrypto1725120000001, CreateUsers1725120000002],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
