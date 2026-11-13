import type { Game } from '../game/model';
import type { SqliteConnection } from './connection';

type Difficulty = Game['difficulty'];

export interface DifficultyStats {
  started: number;
  completed: number;
  won: number;
  bestMs: number | null;
  averageMs: number | null;
  mistakes: number;
  hintsUsed: number;
}

export interface Statistics {
  byDifficulty: Record<Difficulty, DifficultyStats>;
  total: DifficultyStats;
  currentStreak: number;
  longestStreak: number;
  dailyResults: readonly DailyResult[];
}

export type DailyResult = {
  date: string;
  status: 'won' | 'lost';
  elapsedMs: number;
  mistakes: number;
};

type SummaryRow = Omit<DifficultyStats, 'averageMs'> & {
  difficulty: Difficulty;
  wonElapsedMs: number;
};

const empty = (): DifficultyStats => ({
  started: 0,
  completed: 0,
  won: 0,
  bestMs: null,
  averageMs: null,
  mistakes: 0,
  hintsUsed: 0,
});

function calendarDay(date: string): number {
  // Interpret the local date label in UTC to compare calendar days across DST changes.
  return Date.parse(`${date}T00:00:00Z`) / 86_400_000;
}

export async function loadStatistics(db: SqliteConnection, today: string): Promise<Statistics> {
  const rows = await db.getAllAsync<SummaryRow>(`
    SELECT difficulty,
      COUNT(*) AS started,
      COUNT(completed_at) AS completed,
      COUNT(CASE WHEN status = 'won' THEN 1 END) AS won,
      MIN(CASE WHEN status = 'won' THEN elapsed_ms END) AS bestMs,
      SUM(CASE WHEN status = 'won' THEN elapsed_ms ELSE 0 END) AS wonElapsedMs,
      SUM(mistakes) AS mistakes,
      SUM(hints_used) AS hintsUsed
    FROM games WHERE statistics_included = 1 GROUP BY difficulty
  `);

  const byDifficulty = { easy: empty(), medium: empty(), hard: empty(), expert: empty() };
  const total = empty();
  let totalWonElapsedMs = 0;

  for (const { difficulty, wonElapsedMs, ...stats } of rows) {
    byDifficulty[difficulty] = { ...stats, averageMs: stats.won ? wonElapsedMs / stats.won : null };
    total.started += stats.started;
    total.completed += stats.completed;
    total.won += stats.won;
    total.mistakes += stats.mistakes;
    total.hintsUsed += stats.hintsUsed;
    totalWonElapsedMs += wonElapsedMs;
    if (stats.bestMs !== null) {
      total.bestMs = Math.min(total.bestMs ?? stats.bestMs, stats.bestMs);
    }
  }
  total.averageMs = total.won ? totalWonElapsedMs / total.won : null;

  const dailyResults = await db.getAllAsync<DailyResult>(`
    SELECT daily_date AS date, status, elapsed_ms AS elapsedMs, mistakes FROM games
    WHERE statistics_included = 1 AND daily_date IS NOT NULL AND status IN ('won', 'lost')
    ORDER BY daily_date
  `);
  const todayDay = calendarDay(today);
  let previous = -Infinity;
  let streak = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  for (const { date, status } of dailyResults) {
    if (status !== 'won') continue;
    const day = calendarDay(date);
    streak = day === previous + 1 ? streak + 1 : 1;
    previous = day;
    longestStreak = Math.max(longestStreak, streak);
    if (day === todayDay || day === todayDay - 1) currentStreak = streak;
  }

  return {
    byDifficulty, total, currentStreak, longestStreak,
    dailyResults: dailyResults.reverse().map((result) => ({ ...result })),
  };
}
