import { openDatabaseAsync } from 'expo-sqlite';
import { createRepository, type Repository } from './repository';

export type { Repository } from './repository';
export type { DifficultyStats, Statistics } from './statistics';

let repository: Promise<Repository> | undefined;

async function openRepository(): Promise<Repository> {
  const db = await openDatabaseAsync('sudoku.db');
  try {
    return await createRepository(db);
  } catch (error) {
    await db.closeAsync().catch(() => undefined);
    throw error;
  }
}

export function getRepository(): Promise<Repository> {
  repository ??= openRepository().catch((error: unknown) => {
    repository = undefined;
    throw error;
  });
  return repository;
}
