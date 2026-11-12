import type { Difficulty } from './board';
import { seededRandom } from './random';

// Increment whenever a generation change can change seeded puzzles.
export const GENERATOR_VERSION = 1;
const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

/** The date is the player's local calendar date as YYYY-MM-DD. */
export function dailySeed(date: string): string {
  return `sudoku-daily-v${GENERATOR_VERSION}:7b4b0a21:${date}`;
}

export function dailyDifficulty(date: string): Difficulty {
  const random = seededRandom(`${dailySeed(date)}:difficulty`);
  return DIFFICULTIES[Math.floor(random() * DIFFICULTIES.length)];
}
