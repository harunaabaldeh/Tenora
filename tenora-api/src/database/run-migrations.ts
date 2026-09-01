import dataSource from './data-source';

async function runMigrations(): Promise<void> {
  await dataSource.initialize();

  try {
    const applied = await dataSource.runMigrations();
    if (applied.length === 0) {
      console.log('No pending migrations');
      return;
    }

    for (const migration of applied) {
      console.log(`Applied ${migration.name}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

void runMigrations();
