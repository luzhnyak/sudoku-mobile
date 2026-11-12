import { defaultSettings } from '../../src/game/model';
import {
  createGame,
  enterDigit,
  erase,
  explain,
  recordExplanation,
  redo,
  restart,
  reveal,
  undo,
} from '../../src/game/rules';
import { digitBit, findConflicts } from '../../src/engine';
import type { Board, Puzzle } from '../../src/engine';

const solution: Board = Array.from(
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  Number,
);
const puzzle: Puzzle = {
  solution,
  puzzle: Array.from(
    '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
    Number,
  ),
  difficulty: 'easy',
};
const nearSolved: Puzzle = {
  ...puzzle,
  puzzle: solution.map((value, index) => (index === 2 || index === 3 ? 0 : value)),
};

function start(source: Puzzle = puzzle) {
  return createGame(source, { id: 'game-1', now: 100 });
}

test('starts a daily game from its givens with a clean attempt', () => {
  const game = createGame(puzzle, { id: 'day-1', now: 100, dailyDate: '2026-11-11' });

  expect(game).toMatchObject({
    id: 'day-1',
    type: 'daily',
    dailyDate: '2026-11-11',
    status: 'playing',
    difficulty: 'easy',
    elapsedMs: 0,
    createdAt: 100,
    updatedAt: 100,
    completedAt: null,
    mistakes: 0,
    hintsUsed: 0,
    cursor: 0,
    history: [],
  });
  expect(game.board).toEqual(puzzle.puzzle);
  expect(game.notes).toEqual(Array(81).fill(0));
});

test('protects givens and ignores invalid cell indices', () => {
  const game = start();

  expect(enterDigit(game, 0, 4, false, defaultSettings, 200)).toBe(game);
  expect(enterDigit(game, 0, 4, true, defaultSettings, 200)).toBe(game);
  expect(erase(game, 0, 200)).toBe(game);
  expect(enterDigit(game, 81, 4, false, defaultSettings, 200)).toBe(game);
  expect(erase(game, 2.5, 200)).toBe(game);
});

test('toggles notes without adding digits, conflicts or mistakes', () => {
  const game = start();
  const withNote = enterDigit(game, 2, 5, true, defaultSettings, 200);
  const toggled = enterDigit(withNote, 2, 5, true, defaultSettings, 300);

  expect(withNote.notes[2]).toBe(digitBit(5));
  expect(withNote.board[2]).toBe(0);
  expect(withNote.mistakes).toBe(0);
  expect(findConflicts(withNote.board).size).toBe(0);
  expect(toggled.notes[2]).toBe(0);
  expect(undo(toggled, 400).notes[2]).toBe(digitBit(5));
});

test('undo and redo restore all notes cleared by a placement', () => {
  let game = start();
  for (const index of [2, 3, 40]) {
    game = enterDigit(game, index, 4, true, defaultSettings, 200);
  }
  game = enterDigit(game, 3, 6, true, defaultSettings, 300);
  const placed = enterDigit(game, 2, 4, false, defaultSettings, 400);

  expect(placed.board[2]).toBe(4);
  expect(placed.notes[2]).toBe(0);
  expect(placed.notes[3]).toBe(digitBit(6));
  expect(placed.notes[40]).toBe(digitBit(4));
  expect(game.board[2]).toBe(0);

  const undone = undo(placed, 500);
  expect(undone.board).toEqual(game.board);
  expect(undone.notes).toEqual(game.notes);

  const redone = redo(undone, 600);
  expect(redone.board).toEqual(placed.board);
  expect(redone.notes).toEqual(placed.notes);
});

test('a note can be erased and new edits discard the redo branch', () => {
  const withNote = enterDigit(start(), 2, 4, true, defaultSettings, 200);
  const erased = erase(withNote, 2, 300);
  expect(erased.notes[2]).toBe(0);

  const undone = undo(erased, 400);
  expect(undone.notes[2]).toBe(digitBit(4));

  const revised = enterDigit(undone, 2, 1, true, defaultSettings, 500);
  expect(revised.notes[2]).toBe(digitBit(1) | digitBit(4));
  expect(redo(revised, 600)).toBe(revised);
});

test('preserves peer notes when auto removal is off', () => {
  const game = enterDigit(start(), 3, 4, true, defaultSettings, 200);
  const settings = { ...defaultSettings, autoRemoveNotes: false };
  const placed = enterDigit(game, 2, 4, false, settings, 300);

  expect(placed.notes[3]).toBe(digitBit(4));
  expect(enterDigit(placed, 2, 5, true, settings, 400)).toBe(placed);
  expect(erase(placed, 2, 500).board[2]).toBe(0);
});

test('counts distinct incorrect placements only with mistake checking enabled', () => {
  const enabled = { ...defaultSettings, mistakeCheck: true };
  const disabled = { ...enabled, mistakeCheck: false, mistakeLimit: 1 };
  const game = start();

  const checked = enterDigit(game, 2, 1, false, enabled, 200);
  expect(checked.board[2]).toBe(1);
  expect(checked.mistakes).toBe(1);
  expect(enterDigit(checked, 2, 1, false, enabled, 300)).toBe(checked);
  const undone = undo(checked, 300);
  expect(undone.mistakes).toBe(1);
  expect(redo(undone, 400).mistakes).toBe(1);

  const unchecked = enterDigit(game, 2, 1, false, disabled, 200);
  expect(unchecked.board[2]).toBe(1);
  expect(unchecked.mistakes).toBe(0);
  expect(unchecked.status).toBe('playing');
});

test('reaching the optional mistake limit finishes the attempt', () => {
  const game = { ...start(), elapsedMs: 1900 };
  const settings = { ...defaultSettings, mistakeCheck: true, mistakeLimit: 1 };
  const lost = enterDigit(game, 2, 1, false, settings, 2000);

  expect(lost).toMatchObject({ status: 'lost', completedAt: 2000, elapsedMs: 1900, mistakes: 1 });
  expect(undo(lost, 2100)).toBe(lost);
  expect(reveal(lost, 2, settings, 2100)).toBe(lost);
  expect(restart(lost, 2100)).toBe(lost);
});

test('an explanation finds a logical cell on the current board', () => {
  const game = start(nearSolved);
  const hint = explain(game);

  expect(hint?.cells).toEqual(expect.arrayContaining([2]));
  expect(hint?.placement).toEqual({ cell: 2, digit: 4 });
  expect(hint?.explanation).toMatch(/[а-яіїєґ]/iu);
  expect(recordExplanation(game, 200)).toMatchObject({ board: game.board, hintsUsed: 1 });
});

test('an explanation does not deduct from a wrong entry', () => {
  const settings = { ...defaultSettings, mistakeCheck: false };
  const game = enterDigit(start(), 2, 1, false, settings, 200);

  expect(findConflicts(game.board).size).toBe(0);
  expect(explain(game)).toBeNull();
  expect(recordExplanation(game, 300)).toBe(game);
});

test('reveal avoids adding a conflict when a wrong peer blocks the target', () => {
  const game = enterDigit(start(nearSolved), 3, 4, false, defaultSettings, 200);
  expect(reveal(game, 2, defaultSettings, 300)).toBe(game);

  const revealed = reveal(game, null, defaultSettings, 300);
  expect(revealed.board.slice(2, 4)).toEqual([0, 6]);
  expect(revealed.hintsUsed).toBe(1);
  expect(findConflicts(revealed.board).size).toBe(0);
  expect(undo(revealed, 400).hintsUsed).toBe(1);
});

test('a full board wins only with the correct solution', () => {
  const game = start(nearSolved);
  const unchecked = { ...defaultSettings, mistakeCheck: false };
  const almost = enterDigit(game, 2, 4, false, unchecked, 200);
  const incorrect = enterDigit(almost, 3, 7, false, unchecked, 300);

  expect(incorrect.board.every((value) => value > 0)).toBe(true);
  expect(incorrect).toMatchObject({ status: 'playing', completedAt: null });

  const won = reveal(incorrect, 3, unchecked, 400);
  expect(won.board).toEqual(solution);
  expect(won).toMatchObject({ status: 'won', completedAt: 400, hintsUsed: 1 });
  expect(undo(won, 500)).toBe(won);
});

test('restarts an active daily puzzle from its original givens', () => {
  const game = createGame(puzzle, { id: 'day-1', now: 100, dailyDate: '2026-11-11' });
  const moved = enterDigit(game, 2, 1, false, { ...defaultSettings, mistakeCheck: true }, 200);
  const restarted = restart({ ...moved, hintsUsed: 1, elapsedMs: 500 }, 600);

  expect(restarted.board).toEqual(puzzle.puzzle);
  expect(restarted.notes).toEqual(Array(81).fill(0));
  expect(restarted).toMatchObject({
    id: 'day-1',
    dailyDate: '2026-11-11',
    status: 'playing',
    elapsedMs: 0,
    mistakes: 0,
    hintsUsed: 0,
    createdAt: 100,
    updatedAt: 600,
    cursor: 0,
    history: [],
  });
});
