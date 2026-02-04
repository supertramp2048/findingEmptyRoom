import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedColumn1702000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deleted column to buildings table
    const hasBuilding = await queryRunner.hasColumn('buildings', 'deleted');
    if (!hasBuilding) {
      await queryRunner.query(
        `ALTER TABLE "buildings" ADD "deleted" boolean NOT NULL DEFAULT false`,
      );
    }

    // Add deleted column to rooms table
    const hasRooms = await queryRunner.hasColumn('rooms', 'deleted');
    if (!hasRooms) {
      await queryRunner.query(
        `ALTER TABLE "rooms" ADD "deleted" boolean NOT NULL DEFAULT false`,
      );
    }

    // Add deleted column to schedules table
    const hasSchedules = await queryRunner.hasColumn('schedules', 'deleted');
    if (!hasSchedules) {
      await queryRunner.query(
        `ALTER TABLE "schedules" ADD "deleted" boolean NOT NULL DEFAULT false`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop deleted column from schedules table
    await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN "deleted"`);

    // Drop deleted column from rooms table
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "deleted"`);

    // Drop deleted column from buildings table
    await queryRunner.query(`ALTER TABLE "buildings" DROP COLUMN "deleted"`);
  }
}
