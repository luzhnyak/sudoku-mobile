export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Board = readonly number[];
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type Puzzle = {
  puzzle: Board;
  solution: Board;
  difficulty: Difficulty;
};

export const DIGITS: readonly Digit[] = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9]);
export const SIZE = 9;
export const CELL_COUNT = SIZE * SIZE;
export const ALL_DIGITS = (1 << SIZE) - 1;

export const rowOf = (cell: number): number => Math.floor(cell / SIZE);
export const columnOf = (cell: number): number => cell % SIZE;
export const boxOf = (cell: number): number => (
  Math.floor(rowOf(cell) / 3) * 3 + Math.floor(columnOf(cell) / 3)
);

export const digitBit = (digit: number): number => 1 << (digit - 1);
export const bitDigit = (bit: number): Digit => (32 - Math.clz32(bit)) as Digit;
export const bitCounts = Uint8Array.from({ length: ALL_DIGITS + 1 }, (_, mask) => {
  let count = 0;
  for (let bits = mask; bits; bits &= bits - 1) count++;
  return count;
});

export const CELLS = Array.from({ length: CELL_COUNT }, (_, cell) => cell);
export const CELL_UNITS = CELLS.map((cell) => [rowOf(cell), SIZE + columnOf(cell), 2 * SIZE + boxOf(cell)] as const);
export const UNITS = Array.from({ length: 3 * SIZE }, (_, unit) => (
  CELLS.filter((cell) => CELL_UNITS[cell].some((member) => member === unit))
));
export const PEERS: readonly (readonly number[])[] = Object.freeze(CELLS.map((cell) => (
  Object.freeze([...new Set(CELL_UNITS[cell].flatMap((unit) => UNITS[unit]))]
    .filter((peer) => peer !== cell))
)));

export function findConflicts(board: Board): ReadonlySet<number> {
  const conflicts = new Set<number>();
  for (const unit of UNITS) {
    const first = new Int8Array(SIZE + 1).fill(-1);
    for (const cell of unit) {
      const digit = board[cell];
      if (!Number.isInteger(digit) || digit < 1 || digit > SIZE) continue;
      if (first[digit] < 0) first[digit] = cell;
      else {
        conflicts.add(first[digit]);
        conflicts.add(cell);
      }
    }
  }
  return conflicts;
}

export function usedDigits(board: Board): Uint16Array | null {
  if (board.length !== CELL_COUNT) return null;
  const used = new Uint16Array(UNITS.length);
  for (const cell of CELLS) {
    const digit = board[cell];
    if (!Number.isInteger(digit) || digit < 0 || digit > SIZE) return null;
    if (digit === 0) continue;

    const bit = digitBit(digit);
    for (const unit of CELL_UNITS[cell]) {
      if (used[unit] & bit) return null;
      used[unit] |= bit;
    }
  }
  return used;
}

export function candidateMask(used: Uint16Array, cell: number): number {
  const [row, column, box] = CELL_UNITS[cell];
  return ALL_DIGITS & ~(used[row] | used[column] | used[box]);
}
