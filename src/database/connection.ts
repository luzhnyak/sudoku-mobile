type SqliteValue = string | number | null;

export interface SqliteConnection {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: SqliteValue[]): Promise<{ changes: number }>;
  getFirstAsync<T>(sql: string, ...params: SqliteValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: SqliteValue[]): Promise<T[]>;
}

export async function transaction<T>(
  db: SqliteConnection,
  mode: 'read' | 'write',
  operation: () => Promise<T>,
): Promise<T> {
  await db.execAsync(mode === 'write' ? 'BEGIN IMMEDIATE' : 'BEGIN');
  try {
    const result = await operation();
    await db.execAsync('COMMIT');
    return result;
  } catch (error) {
    try {
      await db.execAsync('ROLLBACK');
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], 'SQLite rollback failed');
    }
    throw error;
  }
}
