import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePgcrypto1725120000001 implements MigrationInterface {
  name = 'EnablePgcrypto1725120000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP EXTENSION IF EXISTS pgcrypto');
  }
}
