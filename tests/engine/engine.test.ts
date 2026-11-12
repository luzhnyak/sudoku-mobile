import {
  analyzeDifficulty,
  classifyPuzzle,
  countSolutions,
  dailyDifficulty,
  dailySeed,
  findConflicts,
  generatePuzzle,
  isValidBoard,
  nextHint,
  solve,
} from '../../src/engine';
import type { Board, Difficulty } from '../../src/engine';

const puzzle = Array.from(
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  Number,
);
const solution = Array.from(
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  Number,
);
const empty = Array<number>(81).fill(0);
const difficulties: readonly Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

function expectValidSolution(board: Board) {
  const digits = '123456789';
  const line = (values: number[]) => values.sort((first, second) => first - second).join('');
  for (let i = 0; i < 9; i++) {
    expect(line(board.slice(i * 9, (i + 1) * 9))).toBe(digits);
    expect(line(Array.from({ length: 9 }, (_, row) => board[row * 9 + i]))).toBe(digits);
    const boxStart = Math.floor(i / 3) * 27 + (i % 3) * 3;
    expect(line(Array.from({ length: 9 }, (_, cell) => (
      board[boxStart + Math.floor(cell / 3) * 9 + cell % 3]
    )))).toBe(digits);
  }
}

test('finds every duplicate across rows, columns, and boxes', () => {
  const board = [...empty];
  for (const cell of [0, 8, 9, 10, 31]) board[cell] = 5;

  expect([...findConflicts(board)].sort((a, b) => a - b)).toEqual([0, 8, 9, 10]);
});

test('solves a known puzzle without modifying its input', () => {
  const board = Object.freeze([...puzzle]);

  expect(solve(board)).toEqual(solution);
  expect(countSolutions(board)).toBe(1);
  expect(board).toEqual(puzzle);
});

test('rejects malformed, duplicate, and impossible boards', () => {
  const impossible = [...puzzle];
  impossible[2] = 1;
  expect(isValidBoard(impossible)).toBe(true);
  expect(solve(impossible)).toBeNull();
  expect(countSolutions(impossible)).toBe(0);

  for (const board of [puzzle.slice(1), [10, ...puzzle.slice(1)], [NaN, ...puzzle.slice(1)],
    [3, ...puzzle.slice(1)], Array<number>(81)]) {
    expect(isValidBoard(board)).toBe(false);
    expect(countSolutions(board)).toBe(0);
    expect(solve(board)).toBeNull();
  }
});

test('stops counting a multi-solution puzzle at the requested limit', () => {
  expect(countSolutions(empty, 1)).toBe(1);
  expect(countSolutions(empty)).toBe(2);
  expect(countSolutions(empty, 3)).toBe(3);
});

test('explains a forced placement in Ukrainian and leaves the board intact', () => {
  const board = Object.freeze([0, ...solution.slice(1)]);
  const hint = nextHint(board);

  expect(hint?.kind).toBe('naked-single');
  expect(hint?.placement).toEqual({ cell: 0, digit: 5 });
  expect(hint?.cells).toContain(0);
  expect(hint?.explanation).toMatch(/[а-яіїєґ]/i);
  expect(board[0]).toBe(0);
  expect(nextHint(solution)).toBeNull();
});

test('does not give a hint when the current entries have no solution', () => {
  const board = [...puzzle];
  board[2] = 1;
  expect(findConflicts(board).size).toBe(0);
  expect(nextHint(board)).toBeNull();
});

test('advances past an explained elimination without applying any player notes', () => {
  const board = Array.from('007564000021000050000000009309240100000000004040089060500410003400025000200000008', Number);
  const { steps, solution } = analyzeDifficulty(board);
  for (const step of steps) {
    if (!step.placement) break;
    board[step.placement.cell] = step.placement.digit;
  }
  const remaining = Object.freeze(board);
  const first = nextHint(remaining);
  const next = nextHint(remaining, 1);
  expect(first?.kind).toBe('locked-candidates');
  expect(next?.kind).toBe('hidden-single');
  expect(next?.placement).toBeDefined();
  if (next?.placement) {
    expect(next.placement.digit).toBe(solution?.[next.placement.cell]);
    expect(remaining[next.placement.cell]).toBe(0);
  }
});

test('classifies the same puzzle consistently from a complete logical trace', () => {
  expect(classifyPuzzle([0, ...solution.slice(1)])).toBe('easy');
  expect(classifyPuzzle(puzzle)).toBe('medium');
  expect(classifyPuzzle(empty)).toBeNull();
});

test.each([
  ['naked-pair', 'hard', '000900206000056100020000000000000780008024000036005000190000005000000040207080090'],
  ['hidden-pair', 'expert', '350708000007000350008035170006000000530604280200001900400062000000003500825040030'],
  ['x-wing', 'expert', '000000540690008007040005009003050900054076000700030000502000098000580030300427100'],
] as const)('uses %s eliminations when rating a %s fixture', (kind, difficulty, clues) => {
  const board = Array.from(clues, Number);
  const report = analyzeDifficulty(board);

  expect(report.difficulty).toBe(difficulty);
  expect(report.solution).toEqual(solve(board));
  expect(report.steps.some((step) => step.kind === kind && step.eliminations.length > 0)).toBe(true);
});

test('reproduces a versioned daily puzzle from the local calendar date', async () => {
  const date = '2026-11-11';
  const seed = dailySeed(date);
  const difficulty = dailyDifficulty(date);
  const first = await generatePuzzle(difficulty, { seed });
  const repeat = await generatePuzzle(difficulty, { seed: dailySeed(date) });
  const following = await generatePuzzle(difficulty, { seed: dailySeed('2026-11-12') });

  expect(first).toEqual(repeat);
  expect(following.puzzle).not.toEqual(first.puzzle);
});

test('yields to the event loop before generation and accepts cancellation', async () => {
  const controller = new AbortController();
  const cancellation = setTimeout(() => controller.abort(), 0);
  try {
    await expect(generatePuzzle('expert', { seed: 'cancelled', signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
  } finally {
    clearTimeout(cancellation);
  }
});

test.each(difficulties)('generates 60 varied and correctly classified %s puzzles', async (difficulty) => {
  const distinct = new Set<string>();
  for (let index = 0; index < 60; index++) {
    const result = await generatePuzzle(difficulty, { seed: `engine-stress-${index}` });
    expectValidSolution(result.solution);
    expect(result.puzzle.every((clue, cell) => clue === 0 || clue === result.solution[cell])).toBe(true);
    expect(countSolutions(result.puzzle)).toBe(1);
    expect(solve(result.puzzle)).toEqual(result.solution);
    const report = analyzeDifficulty(result.puzzle);
    expect(report.difficulty).toBe(difficulty);
    expect(report.solution).toEqual(result.solution);
    for (const step of report.steps) {
      if (step.placement) {
        expect(result.solution[step.placement.cell]).toBe(step.placement.digit);
      }
      for (const { cell, digits } of step.eliminations) {
        expect(digits).not.toContain(result.solution[cell]);
      }
    }
    distinct.add(result.puzzle.join(''));
  }
  expect(distinct.size).toBe(60);
}, 60_000);
