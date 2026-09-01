import dataSource from './data-source';

async function revertLastMigration(): Promise<void> {
  await dataSource.initialize();

  try {
    await dataSource.undoLastMigration();
    console.log('Reverted last migration');
  } finally {
    await dataSource.destroy();
  }
}

void revertLastMigration();
