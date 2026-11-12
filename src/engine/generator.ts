import { CELLS, columnOf, DIGITS, rowOf, SIZE } from './board';
import type { Board, Difficulty, Puzzle } from './board';
import { analyzeDifficulty, classifyPuzzle } from './logicalSolver';
import { seededRandom, shuffled } from './random';
import type { Random } from './random';
import { searchSudoku } from './solver';

export type GenerateOptions = { seed?: string; signal?: AbortSignal };

const ATTEMPTS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 2, expert: 3 };
const MIN_REMOVALS: Record<Difficulty, number> = { easy: 36, medium: 43, hard: 47, expert: 47 };
const SEARCH_NODE_LIMIT = 2_500;
const FALLBACK_SEARCH_NODE_LIMIT = 20_000;
const OPERATIONS_PER_SLICE = 12;
const SLICE_MS = 6;

// Generated offline by this engine and checked for uniqueness and exact rating.
const FALLBACKS: Record<Difficulty, readonly string[]> = {
  easy: [
    '005700306080023501070580049620030050500102693093460708400210835052040900031009062',
    '030010406650039270720050390070008513005307002060500704100025807007183045083470109',
    '000205708200760001007300920003100207572803610816970053038420195025039070000010302',
  ],
  medium: [
    '005000306080023501000500049620030050500102693093400008400010835050040900031009062',
    '030010400650030270720050390070000513005300002060500700100025007007183040083470109',
    '000205708200760001007300020003100200570003610816970053038420005005039070000010302',
  ],
  hard: [
    '030010400650030070720050300070000513000300002060500700100025007007180000083470109',
    '007564000021000050000000009309240100000000004040089060500410003400025000200000008',
    '000900206000056100020000000000000780008024000036005000190000005000000040207080090',
    '049700650000310002600000070000000000000009006015203000060090280008000007000070504',
  ],
  expert: [
    '000000900078005206100600000037000492295047010601000007020008004080000075006030000',
    '008052000000000040420000301000006000003700010200040075000004000000810056080000900',
    '350708000007000350008035170006000000530604280200001900400062000000003500825040030',
    '430060900007050030006100205394000020000000100000000003000000080060500004500740009',
    '302109060006000930400360000001800709000000050000450023040020690900040070070001080',
    '000000540690008007040005009003050900054076000700030000502000098000580030300427100',
    '049020300000070010000400002900000600000300081030089005087010040000008003200007050',
  ],
};

function abortIfNeeded(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;
  const error = new Error('Генерацію головоломки перервано.');
  error.name = 'AbortError';
  throw error;
}

async function yieldTurn(signal: AbortSignal | undefined): Promise<void> {
  abortIfNeeded(signal);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  abortIfNeeded(signal);
}

function equivalentBoard(board: Board, random: Random): Board {
  const groups = [0, 1, 2];
  const axis = () => shuffled(groups, random).flatMap((group) => (
    shuffled(groups, random).map((position) => group * 3 + position)
  ));
  const rows = axis();
  const columns = axis();
  const digits = [0, ...shuffled(DIGITS, random)];
  const transpose = random() < 0.5;
  return CELLS.map((cell) => {
    const row = rows[rowOf(cell)];
    const column = columns[columnOf(cell)];
    return digits[board[transpose ? column * SIZE + row : row * SIZE + column]];
  });
}

async function fallback(difficulty: Difficulty, random: Random, signal?: AbortSignal): Promise<Puzzle> {
  const bases = shuffled(FALLBACKS[difficulty], random).map((text) => Array.from(text, Number));

  function verified(puzzle: Board): Puzzle | null {
    const report = analyzeDifficulty(puzzle);
    if (report.difficulty !== difficulty || !report.solution) return null;
    const search = searchSudoku(puzzle, 2, { maxNodes: FALLBACK_SEARCH_NODE_LIMIT });
    return search.count === 1 && !search.budgetExceeded ? { puzzle, solution: report.solution, difficulty } : null;
  }

  for (const base of bases) {
    for (let attempt = 0; attempt < 4; attempt++) {
      await yieldTurn(signal);
      const puzzle = verified(equivalentBoard(base, random));
      if (puzzle) return puzzle;
    }
  }

  // Transformations preserve uniqueness. Rechecking the logical trace above
  // accounts for technique selection order changing with row and digit order.
  for (const base of bases) {
    await yieldTurn(signal);
    const puzzle = verified(base);
    if (puzzle) return puzzle;
  }
  throw new Error('Не вдалося створити головоломку заданої складності.');
}

export async function generatePuzzle(difficulty: Difficulty, options: GenerateOptions = {}): Promise<Puzzle> {
  const { signal } = options;
  const random = seededRandom(options.seed ?? `${Date.now()}:${Math.random()}`);
  await yieldTurn(signal);
  let sliceStart = performance.now();
  let operations = 0;

  for (let attempt = 0; attempt < ATTEMPTS[difficulty]; attempt++) {
    const empty = Array<number>(CELLS.length).fill(0);
    const { solution } = searchSudoku(empty, 1, { random, maxNodes: SEARCH_NODE_LIMIT });
    if (!solution) continue;

    const puzzle = [...solution];
    let removed = 0;
    for (const cell of shuffled(CELLS, random)) {
      if (++operations >= OPERATIONS_PER_SLICE || performance.now() - sliceStart >= SLICE_MS) {
        await yieldTurn(signal);
        operations = 0;
        sliceStart = performance.now();
      }

      puzzle[cell] = 0;
      const search = searchSudoku(puzzle, 2, { maxNodes: SEARCH_NODE_LIMIT });
      if (search.count !== 1 || search.budgetExceeded) {
        puzzle[cell] = solution[cell];
        continue;
      }

      removed++;
      if (removed >= MIN_REMOVALS[difficulty] && classifyPuzzle(puzzle) === difficulty) {
        return { puzzle, solution, difficulty };
      }
    }
  }

  return fallback(difficulty, random, signal);
}
