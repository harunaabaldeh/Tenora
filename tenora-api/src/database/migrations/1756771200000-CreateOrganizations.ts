import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateOrganizations1756771200000 implements MigrationInterface {
  name = 'CreateOrganizations1756771200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('organizations')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'organizations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '80',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['agency', 'independent'],
            enumName: 'organization_type',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '32',
            isNullable: true,
          },
          {
            name: 'website',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createCheckConstraint(
      'organizations',
      new TableCheck({
        name: 'organizations_slug_lowercase',
        expression: 'slug = lower(slug)',
      }),
    );

    await queryRunner.createCheckConstraint(
      'organizations',
      new TableCheck({
        name: 'organizations_email_lowercase',
        expression: 'email IS NULL OR email = lower(email)',
      }),
    );

    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'organizations_slug_active_idx',
        columnNames: ['slug'],
        isUnique: true,
        where: '"deleted_at" IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'organizations_type_idx',
        columnNames: ['type'],
        where: '"deleted_at" IS NULL',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'organization_members',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['owner', 'admin', 'member'],
            enumName: 'organization_member_role',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'organization_members',
      new TableForeignKey({
        name: 'organization_members_organization_id_fkey',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'organization_members',
      new TableForeignKey({
        name: 'organization_members_user_id_fkey',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'organization_members',
      new TableIndex({
        name: 'organization_members_org_user_active_idx',
        columnNames: ['organization_id', 'user_id'],
        isUnique: true,
        where: '"deleted_at" IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'organization_members',
      new TableIndex({
        name: 'organization_members_user_idx',
        columnNames: ['user_id'],
        where: '"deleted_at" IS NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('organization_members')) {
      await queryRunner.dropTable('organization_members');
    }
    if (await queryRunner.hasTable('organizations')) {
      await queryRunner.dropTable('organizations');
    }
    await queryRunner.query('DROP TYPE IF EXISTS "organization_member_role"');
    await queryRunner.query('DROP TYPE IF EXISTS "organization_type"');
  }
}
