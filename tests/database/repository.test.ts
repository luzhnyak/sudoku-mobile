import assert from 'node:assert/strict';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test, type TestContext } from 'node:test';
import { createRepository, type SqliteConnection } from '../../src/database/repository';
import type { Game, Move, Settings } from '../../src/game/model';

function connect(db: DatabaseSync): SqliteConnection {
  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, ...params) {
      const result = db.prepare(sql).run(...params);
      return { changes: Number(result.changes) };
    },
    async getFirstAsync<T>(sql: string, ...params: (string | number | null)[]) {
      return (db.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(sql: string, ...params: (string | number | null)[]) {
      return db.prepare(sql).all(...params) as T[];
    },
  };
}

async function open(t: TestContext) {
  const db = new DatabaseSync(':memory:', { enableForeignKeyConstraints: false });
  t.after(() => db.close());
  return { db, repository: await createRepository(connect(db)) };
}

const solution = [
  1, 2, 3, 4, 5, 6, 7, 8, 9,
  4, 5, 6, 7, 8, 9, 1, 2, 3,
  7, 8, 9, 1, 2, 3, 4, 5, 6,
  2, 3, 4, 5, 6, 7, 8, 9, 1,
  5, 6, 7, 8, 9, 1, 2, 3, 4,
  8, 9, 1, 2, 3, 4, 5, 6, 7,
  3, 4, 5, 6, 7, 8, 9, 1, 2,
  6, 7, 8, 9, 1, 2, 3, 4, 5,
  9, 1, 2, 3, 4, 5, 6, 7, 8,
];
const puzzle = [0, 0, ...solution.slice(2)];
const move1: Move = { cells: [{ index: 0, before: { value: 0, notes: 0 }, after: { value: 1, notes: 0 } }] };
const move2: Move = { cells: [{ index: 1, before: { value: 0, notes: 0 }, after: { value: 0, notes: 2 } }] };
const move3: Move = { cells: [{ index: 1, before: { value: 0, notes: 2 }, after: { value: 0, notes: 6 } }] };
const branchMove: Move = { cells: [{ index: 1, before: { value: 0, notes: 0 }, after: { value: 0, notes: 4 } }] };

function game(id: string, overrides: Partial<Game> = {}): Game {
  return {
    id,
    puzzle,
    solution,
    board: overrides.status === 'won' ? solution : puzzle,
    notes: Array<number>(81).fill(0),
    difficulty: 'easy',
    type: 'classic',
    dailyDate: null,
    status: 'playing',
    elapsedMs: 0,
    mistakes: 0,
    hintsUsed: 0,
    createdAt: 1_000,
    updatedAt: 1_000,
    completedAt: overrides.status === 'won' || overrides.status === 'lost' ? 2000 : null,
    history: [],
    cursor: 0,
    ...overrides,
  };
}

test('reopens a saved game with its original puzzle and redo history', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'sudoku-repository-'));
  const file = join(directory, 'sudoku.sqlite');
  const first = new DatabaseSync(file);
  const saved = game('daily-2026-11-11', {
    type: 'daily',
    dailyDate: '2026-11-11',
    board: [1, 0, ...solution.slice(2)],
    elapsedMs: 1251,
    mistakes: 2,
    hintsUsed: 1,
    updatedAt: 2251,
    history: [move1, move2],
    cursor: 1,
  });

  try {
    try {
      const repository = await createRepository(connect(first));
      assert.equal(first.prepare('PRAGMA journal_mode').get()?.journal_mode, 'wal');
      await repository.saveGame(saved);
    } finally {
      first.close();
    }

    const second = new DatabaseSync(file);
    try {
      const repository = await createRepository(connect(second));
      assert.deepEqual(await repository.getGame(saved.id), saved);
      assert.deepEqual(await repository.getDaily('2026-11-11'), saved);
      assert.equal(await repository.getDaily('2026-11-10'), null);
    } finally {
      second.close();
    }
  } finally {
    unlinkSync(file);
    rmdirSync(directory);
  }
});

test('replaces an abandoned redo branch without retaining obsolete moves', async (t) => {
  const { repository } = await open(t);
  const prior = game('branch', { board: [1, 0, ...solution.slice(2)], history: [move1, move2, move3], cursor: 1 });
  const branched = {
    ...prior,
    board: [1, 0, ...solution.slice(2)],
    notes: [0, 4, ...prior.notes.slice(2)],
    history: [move1, branchMove],
    cursor: 2,
  };

  await Promise.all([repository.saveGame(prior), repository.saveGame(branched)]);
  assert.deepEqual(await repository.getLatestActive(), branched);
});

test('rolls back the entire snapshot when a move cannot be stored', async (t) => {
  const { db, repository } = await open(t);
  const prior = game('atomic', { history: [move1], cursor: 1 });
  await repository.saveGame(prior);
  db.exec(`
    CREATE TRIGGER reject_move BEFORE INSERT ON game_moves
    WHEN NEW.move_index = 1
    BEGIN
      SELECT RAISE(ABORT, 'simulated move failure');
    END;
  `);

  await assert.rejects(repository.saveGame({
    ...prior, elapsedMs: 4500, history: [move1, move2], cursor: 2,
  }), /simulated move failure/);
  assert.deepEqual(await repository.getGame(prior.id), prior);
});

test('returns the most recently updated active game across both modes', async (t) => {
  const { repository } = await open(t);
  await repository.saveGame(game('classic'));
  const daily = game('daily', { type: 'daily', dailyDate: '2026-11-11', updatedAt: 1500 });
  await repository.saveGame(daily);
  await repository.saveGame(game('won', { status: 'won', completedAt: 2000, updatedAt: 2000 }));
  assert.deepEqual(await repository.getLatestActive(), daily);
});

test('enforces daily uniqueness and preserves a recorded result across retries', async (t) => {
  const { repository } = await open(t);
  const daily = game('daily', { type: 'daily', dailyDate: '2026-11-11' });
  const won: Game = { ...daily, status: 'won', completedAt: 3000, updatedAt: 3000, elapsedMs: 2000 };
  await repository.saveGame(daily);
  await repository.saveGame(won);
  await repository.saveGame({ ...won, elapsedMs: 3000 });
  await repository.saveGame(daily);
  await assert.rejects(repository.saveGame({ ...daily, id: 'duplicate' }));
  assert.deepEqual(await repository.getDaily('2026-11-11'), won);
  assert.equal((await repository.getStatistics('2026-11-11')).total.won, 1);
  assert.equal(await repository.getLatestActive(), null);
});

test('preserves a lost daily result when the same puzzle is reopened', async (t) => {
  const { repository } = await open(t);
  const daily = game('daily', { type: 'daily', dailyDate: '2026-11-11' });
  const lost: Game = { ...daily, status: 'lost', mistakes: 3, updatedAt: 3500, completedAt: 3500 };
  await repository.saveGame(lost);
  await repository.saveGame(daily);
  assert.deepEqual(await repository.getDaily('2026-11-11'), lost);
  await repository.saveGame(game('prior-win', { type: 'daily', dailyDate: '2026-11-10', status: 'won', elapsedMs: 5500 }));
  assert.deepEqual((await repository.getStatistics('2026-11-11')).dailyResults, [
    { date: '2026-11-11', status: 'lost', elapsedMs: 0, mistakes: 3 },
    { date: '2026-11-10', status: 'won', elapsedMs: 5500, mistakes: 0 },
  ]);
});

test('aggregates best and weighted average time from wins by difficulty', async (t) => {
  const { repository } = await open(t);
  await repository.saveGame(game('easy-1', { status: 'won', elapsedMs: 5000, mistakes: 2 }));
  await repository.saveGame(game('easy-2', { status: 'won', elapsedMs: 6000, hintsUsed: 1 }));
  await repository.saveGame(game('expert-1', { difficulty: 'expert', status: 'won', elapsedMs: 10000 }));
  await repository.saveGame(game('lost', { status: 'lost', elapsedMs: 1000, mistakes: 3, hintsUsed: 2 }));
  await repository.saveGame(game('incomplete'));

  const stats = await repository.getStatistics('2026-11-11');
  assert.deepEqual(stats.total, { started: 5, completed: 4, won: 3, bestMs: 5000, averageMs: 7000, mistakes: 5, hintsUsed: 3 });
  assert.deepEqual(stats.byDifficulty.easy, { started: 4, completed: 3, won: 2, bestMs: 5000, averageMs: 5500, mistakes: 5, hintsUsed: 3 });
  assert.deepEqual(stats.byDifficulty.medium, { started: 0, completed: 0, won: 0, bestMs: null, averageMs: null, mistakes: 0, hintsUsed: 0 });
});

test('computes daily streaks across calendar boundaries and expires a missed day', async (t) => {
  const { repository } = await open(t);
  for (const date of ['2024-02-28', '2024-02-29', '2024-03-01', '2024-03-30', '2024-03-31']) {
    await repository.saveGame(game(date, { type: 'daily', dailyDate: date, status: 'won' }));
  }
  await repository.saveGame(game('2024-04-01', { type: 'daily', dailyDate: '2024-04-01' }));
  const onWinningDay = await repository.getStatistics('2024-03-31');
  assert.equal(onWinningDay.currentStreak, 2);
  assert.equal(onWinningDay.longestStreak, 3);
  assert.equal((await repository.getStatistics('2024-04-01')).currentStreak, 2);
  assert.equal((await repository.getStatistics('2024-04-02')).currentStreak, 0);
});

test('round-trips every preference and keeps it after reopening the repository', async (t) => {
  const { db, repository } = await open(t);
  assert.equal((await repository.getSettings()).mistakeLimit, null);
  const settings: Settings = {
    theme: 'dark',
    language: 'uk',
    highlightMatchingNumbers: false,
    highlightConflicts: false,
    autoRemoveNotes: false,
    mistakeCheck: false,
    mistakeLimit: 5,
    hapticFeedback: false,
    soundEnabled: true,
  };
  await repository.saveSettings(settings);
  const reopened = await createRepository(connect(db));
  assert.deepEqual(await reopened.getSettings(), settings);
  await reopened.saveSettings({ ...settings, mistakeLimit: null });
  assert.equal((await reopened.getSettings()).mistakeLimit, null);
});

test('enables SQLite foreign keys for the move history', async (t) => {
  const { db } = await open(t);
  assert.throws(() => db.prepare('INSERT INTO game_moves (game_id, move_index, move_data) VALUES (?, ?, ?)').run('missing', 0, '{}'), /FOREIGN KEY constraint failed/);
});

test('refuses to open a newer schema without modifying it', async (t) => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec('PRAGMA user_version = 999');
  await assert.rejects(createRepository(connect(db)), /version/i);
  assert.equal(db.prepare('PRAGMA user_version').get()?.user_version, 999);
});
