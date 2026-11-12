import type { Board, Difficulty } from '../engine';

export type GameType = 'classic' | 'daily';
export type GameStatus = 'playing' | 'won' | 'lost';

interface CellState {
  readonly value: number;
  readonly notes: number;
}

export interface CellChange {
  readonly index: number;
  readonly before: CellState;
  readonly after: CellState;
}

export interface Move {
  readonly cells: readonly CellChange[];
}

export interface Game {
  id: string;
  puzzle: Board;
  solution: Board;
  board: Board;
  notes: readonly number[];
  difficulty: Difficulty;
  type: GameType;
  dailyDate: string | null;
  status: GameStatus;
  elapsedMs: number;
  mistakes: number;
  hintsUsed: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  history: readonly Move[];
  cursor: number;
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: 'uk';
  highlightMatchingNumbers: boolean;
  highlightConflicts: boolean;
  autoRemoveNotes: boolean;
  mistakeCheck: boolean;
  mistakeLimit: number | null;
  hapticFeedback: boolean;
  soundEnabled: boolean;
}

export const defaultSettings: Settings = {
  theme: 'system',
  language: 'uk',
  highlightMatchingNumbers: true,
  highlightConflicts: true,
  autoRemoveNotes: true,
  mistakeCheck: true,
  mistakeLimit: null,
  hapticFeedback: true,
  soundEnabled: false,
};
