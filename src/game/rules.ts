import { digitBit, findConflicts, nextHint, PEERS, SIZE } from '../engine';
import type { Board, Digit, LogicalHint, Puzzle } from '../engine';
import type { CellChange, Game, Move, Settings } from './model';

export function remainingDigits(board: Board, solution: Board): readonly number[] {
  const remaining = new Array<number>(SIZE + 1).fill(0);
  solution.forEach((digit, index) => {
    if (board[index] !== digit) remaining[digit] += 1;
  });
  return remaining;
}

export function cellWarnings(board: Board, solution: Board, settings: Settings) {
  const conflicts = findConflicts(board);
  return board.map((value, index) => {
    const incorrect = settings.mistakeCheck && value !== 0 && value !== solution[index];
    return {
      incorrect,
      conflicted: settings.highlightConflicts && conflicts.has(index) && (!settings.mistakeCheck || incorrect),
    };
  });
}

function initialProgress(puzzle: Board) {
  return {
    board: [...puzzle],
    notes: puzzle.map(() => 0),
    status: 'playing' as const,
    elapsedMs: 0,
    mistakes: 0,
    hintsUsed: 0,
    completedAt: null,
    history: [],
    cursor: 0,
  };
}

export function createGame(
  puzzle: Puzzle,
  options: { id: string; now: number; dailyDate?: string },
): Game {
  return {
    id: options.id,
    puzzle: [...puzzle.puzzle],
    solution: [...puzzle.solution],
    difficulty: puzzle.difficulty,
    type: options.dailyDate === undefined ? 'classic' : 'daily',
    dailyDate: options.dailyDate ?? null,
    createdAt: options.now,
    updatedAt: options.now,
    ...initialProgress(puzzle.puzzle),
  };
}

function canEdit(game: Game, index: number): boolean {
  return game.status === 'playing' && game.puzzle[index] === 0;
}

function cellChange(game: Game, index: number, value: number, notes: number): CellChange {
  return {
    index,
    before: { value: game.board[index], notes: game.notes[index] },
    after: { value, notes },
  };
}

function applyMove(game: Game, move: Move, direction: 'before' | 'after', now: number): Game {
  const board = [...game.board];
  const notes = [...game.notes];
  for (const change of move.cells) {
    board[change.index] = change[direction].value;
    notes[change.index] = change[direction].notes;
  }

  return {
    ...game,
    board,
    notes,
    cursor: game.cursor + (direction === 'after' ? 1 : -1),
    updatedAt: now,
  };
}

function addMove(game: Game, cells: readonly CellChange[], now: number): Game {
  const move = { cells };
  const history = [...game.history.slice(0, game.cursor), move];
  return applyMove({ ...game, history }, move, 'after', now);
}

function placeDigit(game: Game, index: number, digit: Digit, settings: Settings, now: number): Game {
  const cells = [cellChange(game, index, digit, 0)];
  if (settings.autoRemoveNotes) {
    const bit = digitBit(digit);
    for (const peer of PEERS[index]) {
      if (game.notes[peer] & bit) {
        cells.push(cellChange(game, peer, game.board[peer], game.notes[peer] & ~bit));
      }
    }
  }

  const moved = addMove(game, cells, now);
  if (moved.board.every((value, cell) => value === moved.solution[cell])) {
    return { ...moved, status: 'won', completedAt: now };
  }
  return moved;
}

export function enterDigit(
  game: Game,
  index: number,
  digit: Digit,
  notesMode: boolean,
  settings: Settings,
  now: number,
): Game {
  if (!canEdit(game, index)) return game;

  if (notesMode) {
    if (game.board[index] !== 0) return game;
    const notes = game.notes[index] ^ digitBit(digit);
    return addMove(game, [cellChange(game, index, 0, notes)], now);
  }

  if (game.board[index] === digit) return game;
  const moved = placeDigit(game, index, digit, settings, now);
  if (!settings.mistakeCheck || game.solution[index] === digit) return moved;

  const mistakes = moved.mistakes + 1;
  if (settings.mistakeLimit !== null && mistakes >= settings.mistakeLimit) {
    return { ...moved, mistakes, status: 'lost', completedAt: now };
  }
  return { ...moved, mistakes };
}

export function erase(game: Game, index: number, now: number): Game {
  if (!canEdit(game, index) || (game.board[index] === 0 && game.notes[index] === 0)) return game;
  return addMove(game, [cellChange(game, index, 0, 0)], now);
}

export function undo(game: Game, now: number): Game {
  if (game.status !== 'playing' || game.cursor === 0) return game;
  return applyMove(game, game.history[game.cursor - 1], 'before', now);
}

export function redo(game: Game, now: number): Game {
  if (game.status !== 'playing' || game.cursor === game.history.length) return game;
  return applyMove(game, game.history[game.cursor], 'after', now);
}

export function explain(game: Game, explainedEliminations = 0): LogicalHint | null {
  if (game.status !== 'playing') return null;
  if (game.board.some((value, index) => value !== 0 && value !== game.solution[index])) return null;
  return nextHint(game.board, explainedEliminations);
}

export function recordExplanation(game: Game, now: number, explainedEliminations = 0): Game {
  if (!explain(game, explainedEliminations)) return game;
  return { ...game, hintsUsed: game.hintsUsed + 1, updatedAt: now };
}

function canReveal(game: Game, index: number): boolean {
  if (!canEdit(game, index)) return false;
  const digit = game.solution[index];
  return game.board[index] !== digit && PEERS[index].every((peer) => game.board[peer] !== digit);
}

export function reveal(game: Game, index: number | null, settings: Settings, now: number): Game {
  if (game.status !== 'playing') return game;
  const target = index ?? game.puzzle.findIndex((_, cell) => canReveal(game, cell));
  if (!canReveal(game, target)) return game;

  const digit = game.solution[target] as Digit;
  const moved = placeDigit(game, target, digit, settings, now);
  return { ...moved, hintsUsed: moved.hintsUsed + 1 };
}

export function restart(game: Game, now: number): Game {
  if (game.status !== 'playing') return game;
  return { ...game, ...initialProgress(game.puzzle), updatedAt: now };
}
