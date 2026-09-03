import { DataSource } from 'typeorm';
import { OrganizationMember } from '../modules/organizations/entities/organization-member.entity';
import { Organization } from '../modules/organizations/entities/organization.entity';
import { User } from '../modules/users/entities/user.entity';
import { CreateUsers1725120000002 } from './migrations/1725120000002-CreateUsers';
import { EnablePgcrypto1725120000001 } from './migrations/1725120000001-EnablePgcrypto';
import { CreateOrganizations1756771200000 } from './migrations/1756771200000-CreateOrganizations';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl:
    process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false,
  extra: {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    application_name: 'tenora-api',
  },
  entities: [User, Organization, OrganizationMember],
  migrations: [
    EnablePgcrypto1725120000001,
    CreateUsers1725120000002,
    CreateOrganizations1756771200000,
  ],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
