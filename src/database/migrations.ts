import { transaction, type SqliteConnection } from './connection';

const migrations = [
  `
  CREATE TABLE games (
    id TEXT PRIMARY KEY NOT NULL,
    puzzle TEXT NOT NULL,
    solution TEXT NOT NULL,
    current_board TEXT NOT NULL,
    notes TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    game_type TEXT NOT NULL CHECK (game_type IN ('classic', 'daily')),
    daily_date TEXT,
    status TEXT NOT NULL CHECK (status IN ('playing', 'won', 'lost')),
    elapsed_ms INTEGER NOT NULL CHECK (elapsed_ms >= 0),
    mistakes INTEGER NOT NULL CHECK (mistakes >= 0),
    hints_used INTEGER NOT NULL CHECK (hints_used >= 0),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    completed_at INTEGER,
    history_cursor INTEGER NOT NULL CHECK (history_cursor >= 0),
    CHECK ((game_type = 'daily') = (daily_date IS NOT NULL)),
    CHECK ((status = 'playing') = (completed_at IS NULL))
  );

  CREATE UNIQUE INDEX games_daily_date ON games (daily_date) WHERE daily_date IS NOT NULL;
  CREATE INDEX games_active_by_update ON games (updated_at DESC, created_at DESC, id DESC)
    WHERE status = 'playing';

  CREATE TABLE game_moves (
    id INTEGER PRIMARY KEY,
    game_id TEXT NOT NULL REFERENCES games (id) ON DELETE CASCADE,
    move_index INTEGER NOT NULL CHECK (move_index >= 0),
    move_data TEXT NOT NULL,
    UNIQUE (game_id, move_index)
  );

  CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    theme TEXT NOT NULL CHECK (theme IN ('light', 'dark', 'system')),
    language TEXT NOT NULL,
    highlight_matching_numbers INTEGER NOT NULL CHECK (highlight_matching_numbers IN (0, 1)),
    highlight_conflicts INTEGER NOT NULL CHECK (highlight_conflicts IN (0, 1)),
    auto_remove_notes INTEGER NOT NULL CHECK (auto_remove_notes IN (0, 1)),
    mistake_check INTEGER NOT NULL CHECK (mistake_check IN (0, 1)),
    mistake_limit INTEGER CHECK (mistake_limit > 0),
    haptic_feedback INTEGER NOT NULL CHECK (haptic_feedback IN (0, 1)),
    sound_enabled INTEGER NOT NULL CHECK (sound_enabled IN (0, 1))
  );
  `,
  `ALTER TABLE games ADD COLUMN statistics_included INTEGER NOT NULL DEFAULT 1
    CHECK (statistics_included IN (0, 1));`,
];

export async function migrate(db: SqliteConnection): Promise<void> {
  await db.execAsync('PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
  await transaction(db, 'write', async () => {
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const version = row?.user_version ?? 0;
    if (version < 0 || version > migrations.length) {
      throw new Error(`Unsupported Sudoku database version ${version}`);
    }

    for (let index = version; index < migrations.length; index++) {
      await db.execAsync(migrations[index]);
      await db.execAsync(`PRAGMA user_version = ${index + 1}`);
    }
  });
  await db.execAsync('PRAGMA journal_mode = WAL');
}
