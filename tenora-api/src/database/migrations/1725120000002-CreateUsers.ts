import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableIndex,
} from 'typeorm';

export class CreateUsers1725120000002 implements MigrationInterface {
  name = 'CreateUsers1725120000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('users')) {
      return;
    }
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'password_hash',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'first_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'last_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '32',
            isNullable: true,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['tenant', 'landlord', 'property_manager', 'agency'],
            enumName: 'user_role',
            isNullable: false,
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
      'users',
      new TableCheck({
        name: 'users_email_lowercase',
        expression: 'email = lower(email)',
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'users_email_active_idx',
        columnNames: ['email'],
        isUnique: true,
        where: '"deleted_at" IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'users_role_idx',
        columnNames: ['role'],
        where: '"deleted_at" IS NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('users'))) {
      return;
    }
    await queryRunner.dropTable('users');
    await queryRunner.query('DROP TYPE IF EXISTS "user_role"');
  }
}
