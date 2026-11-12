import { bitCounts, bitDigit, candidateMask, CELLS, CELL_UNITS, usedDigits } from './board';
import type { Board } from './board';

type SearchOptions = {
  maxNodes?: number;
  random?: () => number;
};

type SearchResult = {
  solution: Board | null;
  count: number;
  budgetExceeded: boolean;
};

export function isValidBoard(board: Board): boolean {
  return usedDigits(board) !== null;
}

export function solve(board: Board): Board | null {
  return searchSudoku(board, 1).solution;
}

export function countSolutions(board: Board, limit = 2): number {
  if (!Number.isSafeInteger(limit) || limit < 1) return 0;
  return searchSudoku(board, limit).count;
}

export function searchSudoku(board: Board, limit: number, options: SearchOptions = {}): SearchResult {
  const result: SearchResult = { solution: null, count: 0, budgetExceeded: false };
  const initialUsed = usedDigits(board);
  if (initialUsed === null) return result;

  const used = initialUsed;
  const values = [...board];
  const remaining = CELLS.filter((cell) => values[cell] === 0);
  const maxNodes = options.maxNodes ?? Infinity;
  const random = options.random;
  let nodes = 0;

  function search(depth: number): boolean {
    if (nodes >= maxNodes) {
      result.budgetExceeded = true;
      return true;
    }
    nodes++;
    if (depth === remaining.length) {
      result.solution ??= [...values];
      result.count++;
      return result.count >= limit;
    }

    let bestIndex = depth;
    let bestMask = 0;
    let bestCount = 10;
    for (let index = depth; index < remaining.length; index++) {
      const mask = candidateMask(used, remaining[index]);
      const count = bitCounts[mask];
      if (count === 0) return false;
      if (count >= bestCount) continue;
      bestIndex = index;
      bestMask = mask;
      bestCount = count;
      if (count === 1) break;
    }

    const cell = remaining[bestIndex];
    remaining[bestIndex] = remaining[depth];
    remaining[depth] = cell;
    const [row, column, box] = CELL_UNITS[cell];
    let stop = false;
    while (bestMask && !stop) {
      let bit = bestMask & -bestMask;
      if (random && bestCount > 1) {
        let rank = Math.floor(random() * bestCount);
        let tail = bestMask;
        while (rank-- > 0) tail &= tail - 1;
        bit = tail & -tail;
      }
      bestMask ^= bit;
      bestCount--;
      values[cell] = bitDigit(bit);
      used[row] |= bit;
      used[column] |= bit;
      used[box] |= bit;
      stop = search(depth + 1);
      used[row] ^= bit;
      used[column] ^= bit;
      used[box] ^= bit;
    }
    values[cell] = 0;
    remaining[depth] = remaining[bestIndex];
    remaining[bestIndex] = cell;
    return stop;
  }

  search(0);
  return result;
}
