import { defaultSettings, type Game, type Move, type Settings } from '../game/model';
import { transaction, type SqliteConnection } from './connection';
import { migrate } from './migrations';
import { loadStatistics, type Statistics } from './statistics';

export type { SqliteConnection } from './connection';

export interface Repository {
  saveGame(game: Game): Promise<void>;
  getGame(id: string): Promise<Game | null>;
  getDaily(date: string): Promise<Game | null>;
  getLatestActive(): Promise<Game | null>;
  saveSettings(settings: Settings): Promise<void>;
  getSettings(): Promise<Settings>;
  getStatistics(today: string): Promise<Statistics>;
  resetStatistics(): Promise<void>;
}

interface GameRow {
  id: string;
  puzzle: string;
  solution: string;
  current_board: string;
  notes: string;
  difficulty: Game['difficulty'];
  game_type: Game['type'];
  daily_date: string | null;
  status: Game['status'];
  elapsed_ms: number;
  mistakes: number;
  hints_used: number;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
  history_cursor: number;
}

interface SettingsRow {
  theme: Settings['theme'];
  language: Settings['language'];
  highlight_matching_numbers: number;
  highlight_conflicts: number;
  auto_remove_notes: number;
  mistake_check: number;
  mistake_limit: number | null;
  haptic_feedback: number;
  sound_enabled: number;
}

async function readGame(db: SqliteConnection, query: string, ...params: string[]): Promise<Game | null> {
  const row = await db.getFirstAsync<GameRow>(query, ...params);
  if (!row) return null;

  const moves = await db.getAllAsync<{ move_data: string }>(
    'SELECT move_data FROM game_moves WHERE game_id = ? ORDER BY move_index',
    row.id,
  );
  return {
    id: row.id,
    puzzle: JSON.parse(row.puzzle) as Game['puzzle'],
    solution: JSON.parse(row.solution) as Game['solution'],
    board: JSON.parse(row.current_board) as Game['board'],
    notes: JSON.parse(row.notes) as Game['notes'],
    difficulty: row.difficulty,
    type: row.game_type,
    dailyDate: row.daily_date,
    status: row.status,
    elapsedMs: row.elapsed_ms,
    mistakes: row.mistakes,
    hintsUsed: row.hints_used,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    history: moves.map(({ move_data }) => JSON.parse(move_data) as Move),
    cursor: row.history_cursor,
  };
}

async function writeGame(db: SqliteConnection, game: Game): Promise<void> {
  const { changes } = await db.runAsync(
    `INSERT INTO games (
      id, puzzle, solution, current_board, notes, difficulty, game_type, daily_date,
      status, elapsed_ms, mistakes, hints_used, created_at, updated_at, completed_at, history_cursor
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      current_board = excluded.current_board,
      notes = excluded.notes,
      status = excluded.status,
      elapsed_ms = excluded.elapsed_ms,
      mistakes = excluded.mistakes,
      hints_used = excluded.hints_used,
      updated_at = excluded.updated_at,
      completed_at = excluded.completed_at,
      history_cursor = excluded.history_cursor,
      statistics_included = CASE WHEN excluded.status = 'playing' THEN games.statistics_included ELSE 1 END
    WHERE games.status = 'playing'`,
    game.id,
    JSON.stringify(game.puzzle),
    JSON.stringify(game.solution),
    JSON.stringify(game.board),
    JSON.stringify(game.notes),
    game.difficulty,
    game.type,
    game.dailyDate,
    game.status,
    game.elapsedMs,
    game.mistakes,
    game.hintsUsed,
    game.createdAt,
    game.updatedAt,
    game.completedAt,
    game.cursor,
  );
  // Terminal snapshots already represent the recorded result for this attempt.
  if (changes === 0) return;

  const existing = await db.getAllAsync<{ move_data: string }>(
    'SELECT move_data FROM game_moves WHERE game_id = ? ORDER BY move_index',
    game.id,
  );
  if (existing.length > game.history.length) {
    await db.runAsync('DELETE FROM game_moves WHERE game_id = ? AND move_index >= ?', game.id, game.history.length);
  }
  for (const [index, move] of game.history.entries()) {
    const data = JSON.stringify(move);
    if (existing[index]?.move_data === data) continue;
    await db.runAsync(
      `INSERT INTO game_moves (game_id, move_index, move_data) VALUES (?, ?, ?)
       ON CONFLICT (game_id, move_index) DO UPDATE SET move_data = excluded.move_data`,
      game.id,
      index,
      data,
    );
  }
}

async function readSettings(db: SqliteConnection): Promise<Settings> {
  const row = await db.getFirstAsync<SettingsRow>('SELECT * FROM settings WHERE id = 1');
  if (!row) return { ...defaultSettings };

  return {
    theme: row.theme,
    language: row.language,
    highlightMatchingNumbers: Boolean(row.highlight_matching_numbers),
    highlightConflicts: Boolean(row.highlight_conflicts),
    autoRemoveNotes: Boolean(row.auto_remove_notes),
    mistakeCheck: Boolean(row.mistake_check),
    mistakeLimit: row.mistake_limit,
    hapticFeedback: Boolean(row.haptic_feedback),
    soundEnabled: Boolean(row.sound_enabled),
  };
}

async function writeSettings(db: SqliteConnection, settings: Settings): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (
      id, theme, language, highlight_matching_numbers, highlight_conflicts,
      auto_remove_notes, mistake_check, mistake_limit, haptic_feedback, sound_enabled
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      theme = excluded.theme,
      language = excluded.language,
      highlight_matching_numbers = excluded.highlight_matching_numbers,
      highlight_conflicts = excluded.highlight_conflicts,
      auto_remove_notes = excluded.auto_remove_notes,
      mistake_check = excluded.mistake_check,
      mistake_limit = excluded.mistake_limit,
      haptic_feedback = excluded.haptic_feedback,
      sound_enabled = excluded.sound_enabled`,
    settings.theme,
    settings.language,
    Number(settings.highlightMatchingNumbers),
    Number(settings.highlightConflicts),
    Number(settings.autoRemoveNotes),
    Number(settings.mistakeCheck),
    settings.mistakeLimit,
    Number(settings.hapticFeedback),
    Number(settings.soundEnabled),
  );
}

export async function createRepository(db: SqliteConnection): Promise<Repository> {
  await migrate(db);
  let pending = Promise.resolve();

  // Keep commands on this connection out of other calls' transactions.
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = pending.then(operation);
    pending = result.then(() => undefined, () => undefined);
    return result;
  }

  function selectGame(query: string, ...params: string[]): Promise<Game | null> {
    return enqueue(() => transaction(db, 'read', () => readGame(db, query, ...params)));
  }

  return {
    saveGame: (game) => enqueue(() => transaction(db, 'write', () => writeGame(db, game))),
    getGame: (id) => selectGame('SELECT * FROM games WHERE id = ?', id),
    getDaily: (date) => selectGame('SELECT * FROM games WHERE daily_date = ?', date),
    getLatestActive: () => selectGame(`
      SELECT * FROM games WHERE status = 'playing'
      ORDER BY updated_at DESC, created_at DESC, id DESC LIMIT 1
    `),
    saveSettings: (settings) => enqueue(() => writeSettings(db, settings)),
    getSettings: () => enqueue(() => readSettings(db)),
    getStatistics: (today) => enqueue(() => transaction(db, 'read', () => loadStatistics(db, today))),
    resetStatistics: () => enqueue(() => transaction(db, 'write', async () => {
      // Retain attempts and daily puzzles so a reset cannot reopen a completed daily.
      await db.runAsync('UPDATE games SET statistics_included = 0');
    })),
  };
}
