import { bitCounts, candidateMask, CELLS, digitBit, PEERS, usedDigits } from './board';
import type { Board, Difficulty } from './board';
import { findLogicalStep } from './techniques';
import type { LogicalStep, Technique } from './techniques';

const TECHNIQUE_LEVEL: Record<Technique, number> = {
  'naked-single': 0,
  'hidden-single': 1,
  'locked-candidates': 2,
  'naked-pair': 2,
  'hidden-pair': 3,
  'x-wing': 3,
};
const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const EASY_STEP_LIMIT = 42;

export type DifficultyReport = {
  difficulty: Difficulty | null;
  solution: Board | null;
  steps: readonly LogicalStep[];
};

export function initialCandidates(board: Board): Uint16Array | null {
  const used = usedDigits(board);
  if (!used) return null;
  return Uint16Array.from(CELLS, (cell) => board[cell] === 0 ? candidateMask(used, cell) : 0);
}

export function hasEmptyCandidateSet(board: Board, candidates: Uint16Array): boolean {
  return CELLS.some((cell) => board[cell] === 0 && bitCounts[candidates[cell]] === 0);
}

export function applyEliminations(candidates: Uint16Array, step: LogicalStep): void {
  for (const { cell, digits } of step.eliminations) {
    for (const digit of digits) candidates[cell] &= ~digitBit(digit);
  }
}

export function analyzeDifficulty(board: Board): DifficultyReport {
  const steps: LogicalStep[] = [];
  const candidates = initialCandidates(board);
  if (!candidates) return { difficulty: null, solution: null, steps };

  const values = [...board];
  let remaining = values.filter((digit) => digit === 0).length;
  let level = 0;
  while (remaining > 0) {
    if (hasEmptyCandidateSet(values, candidates)) break;
    const step = findLogicalStep(candidates);
    if (!step) break;

    steps.push(step);
    level = Math.max(level, TECHNIQUE_LEVEL[step.kind]);
    if (step.placement) {
      const { cell, digit } = step.placement;
      const keep = ~digitBit(digit);
      values[cell] = digit;
      candidates[cell] = 0;
      for (const peer of PEERS[cell]) candidates[peer] &= keep;
      remaining--;
    }
    applyEliminations(candidates, step);
  }
  if (remaining !== 0) return { difficulty: null, solution: null, steps };

  // Easy is a short trace of naked singles. Longer traces of naked singles and
  // traces with hidden singles are Medium. Hard requires locked candidates or
  // a naked pair, and Expert requires a hidden pair or X-Wing.
  const effortLevel = steps.length > EASY_STEP_LIMIT ? 1 : 0;
  return { difficulty: DIFFICULTIES[Math.max(level, effortLevel)], solution: values, steps };
}

export function classifyPuzzle(board: Board): Difficulty | null {
  return analyzeDifficulty(board).difficulty;
}
