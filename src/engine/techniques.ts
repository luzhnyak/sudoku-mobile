import { bitCounts, bitDigit, CELLS, CELL_UNITS, DIGITS, digitBit, SIZE, UNITS } from './board';
import type { Digit } from './board';

export type Technique = 'naked-single' | 'hidden-single' | 'locked-candidates' | 'naked-pair'
  | 'hidden-pair' | 'x-wing';

export type Placement = { cell: number; digit: Digit };
export type Elimination = { cell: number; digits: readonly Digit[] };

export type LogicalStep = {
  kind: Technique;
  pattern: readonly number[];
  digits: readonly Digit[];
  placement?: Placement;
  eliminations: readonly Elimination[];
  unit?: number;
};

function place(kind: 'naked-single' | 'hidden-single', cell: number, bit: number, unit?: number): LogicalStep {
  const digit = bitDigit(bit);
  return { kind, pattern: [cell], digits: [digit], placement: { cell, digit }, eliminations: [], unit };
}

function eliminate(
  kind: Technique,
  candidates: Uint16Array,
  pattern: readonly number[],
  targets: readonly number[],
  remove: number,
  digits: readonly Digit[],
  unit?: number,
): LogicalStep | null {
  const eliminations: Elimination[] = [];
  for (const cell of targets) {
    const removed = candidates[cell] & remove;
    if (removed && !pattern.includes(cell)) {
      eliminations.push({ cell, digits: DIGITS.filter((digit) => (digitBit(digit) & removed) !== 0) });
    }
  }
  return eliminations.length === 0 ? null : { kind, pattern, digits, eliminations, unit };
}

function nakedSingle(candidates: Uint16Array): LogicalStep | null {
  for (const cell of CELLS) {
    if (bitCounts[candidates[cell]] === 1) return place('naked-single', cell, candidates[cell]);
  }
  return null;
}

function hiddenSingle(candidates: Uint16Array): LogicalStep | null {
  for (let unit = 0; unit < UNITS.length; unit++) {
    let seen = 0;
    let repeated = 0;
    for (const cell of UNITS[unit]) {
      repeated |= seen & candidates[cell];
      seen |= candidates[cell];
    }
    const unique = seen & ~repeated;
    if (!unique) continue;
    const bit = unique & -unique;
    const cell = UNITS[unit].find((index) => (candidates[index] & bit) !== 0);
    if (cell !== undefined) return place('hidden-single', cell, bit, unit);
  }
  return null;
}

function lockedCandidates(candidates: Uint16Array): LogicalStep | null {
  for (let unit = 0; unit < UNITS.length; unit++) {
    for (const digit of DIGITS) {
      const bit = digitBit(digit);
      const pattern = UNITS[unit].filter((cell) => (candidates[cell] & bit) !== 0);
      if (pattern.length < 2) continue;
      // A digit in one box/line intersection can be removed from the other side.
      for (const neighbor of CELL_UNITS[pattern[0]]) {
        if (neighbor === unit || !pattern.every((cell) => CELL_UNITS[cell].some((member) => member === neighbor))) {
          continue;
        }
        const step = eliminate('locked-candidates', candidates, pattern, UNITS[neighbor], bit, [digit], unit);
        if (step) return step;
      }
    }
  }
  return null;
}

function nakedPair(candidates: Uint16Array): LogicalStep | null {
  for (let unit = 0; unit < UNITS.length; unit++) {
    const cells = UNITS[unit];
    for (let first = 0; first < cells.length; first++) {
      const mask = candidates[cells[first]];
      if (bitCounts[mask] !== 2) continue;
      const pattern = cells.filter((cell) => candidates[cell] === mask);
      if (pattern.length !== 2 || pattern[0] !== cells[first]) continue;

      const digits = DIGITS.filter((digit) => (digitBit(digit) & mask) !== 0);
      const step = eliminate('naked-pair', candidates, pattern, cells, mask, digits, unit);
      if (step) return step;
    }
  }
  return null;
}

function supportMasks(cells: readonly number[], candidates: Uint16Array): Uint16Array {
  const supports = new Uint16Array(SIZE);
  cells.forEach((cell, index) => {
    for (let mask = candidates[cell]; mask; mask &= mask - 1) {
      supports[bitDigit(mask & -mask) - 1] |= 1 << index;
    }
  });
  return supports;
}

function hiddenPair(candidates: Uint16Array): LogicalStep | null {
  for (let unit = 0; unit < UNITS.length; unit++) {
    const cells = UNITS[unit];
    const supports = supportMasks(cells, candidates);
    for (let first = 0; first < SIZE - 1; first++) {
      const positions = supports[first];
      if (bitCounts[positions] !== 2) continue;
      for (let second = first + 1; second < SIZE; second++) {
        if (supports[second] !== positions) continue;
        const digits = [DIGITS[first], DIGITS[second]];
        const pattern = cells.filter((_, index) => (positions & (1 << index)) !== 0);
        const retain = (1 << first) | (1 << second);
        const eliminations = pattern.flatMap((cell) => {
          const removed = DIGITS.filter((digit) => (digitBit(digit) & candidates[cell] & ~retain) !== 0);
          return removed.length ? [{ cell, digits: removed }] : [];
        });
        if (eliminations.length) return { kind: 'hidden-pair', pattern, digits, eliminations, unit };
      }
    }
  }
  return null;
}

function xWing(candidates: Uint16Array): LogicalStep | null {
  for (const offset of [0, SIZE]) {
    const lines = UNITS.slice(offset, offset + SIZE);
    const supports = lines.map((line) => supportMasks(line, candidates));
    const crossingOffset = SIZE - offset;
    for (let first = 0; first < SIZE - 1; first++) {
      for (let digitIndex = 0; digitIndex < SIZE; digitIndex++) {
        const positions = supports[first][digitIndex];
        if (bitCounts[positions] !== 2) continue;
        for (let second = first + 1; second < SIZE; second++) {
          if (supports[second][digitIndex] !== positions) continue;
          const firstCrossing = bitDigit(positions & -positions) - 1;
          const secondCrossing = bitDigit(positions & (positions - 1)) - 1;
          const pattern = [lines[first][firstCrossing], lines[first][secondCrossing],
            lines[second][firstCrossing], lines[second][secondCrossing]];
          const targets = [...UNITS[crossingOffset + firstCrossing], ...UNITS[crossingOffset + secondCrossing]];
          const step = eliminate('x-wing', candidates, pattern, targets, 1 << digitIndex, [DIGITS[digitIndex]]);
          if (step) return step;
        }
      }
    }
  }
  return null;
}

export function findLogicalStep(candidates: Uint16Array): LogicalStep | null {
  return nakedSingle(candidates)
    ?? hiddenSingle(candidates)
    ?? lockedCandidates(candidates)
    ?? nakedPair(candidates)
    ?? hiddenPair(candidates)
    ?? xWing(candidates);
}
