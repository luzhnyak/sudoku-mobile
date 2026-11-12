import { columnOf, rowOf, SIZE } from './board';
import type { Board } from './board';
import { applyEliminations, hasEmptyCandidateSet, initialCandidates } from './logicalSolver';
import { solve } from './solver';
import { findLogicalStep } from './techniques';
import type { LogicalStep, Technique } from './techniques';

export type LogicalHint = LogicalStep & {
  technique: string;
  explanation: string;
  cells: readonly number[];
};

const TECHNIQUE_LABELS: Record<Technique, string> = {
  'naked-single': 'Єдиний кандидат',
  'hidden-single': 'Єдина позиція',
  'locked-candidates': 'Заблоковані кандидати',
  'naked-pair': 'Відкрита пара',
  'hidden-pair': 'Прихована пара',
  'x-wing': 'X-Wing',
};

function unitName(unit: number): string {
  if (unit < SIZE) return `рядку ${unit + 1}`;
  if (unit < SIZE * 2) return `стовпці ${unit - SIZE + 1}`;
  return `секторі ${unit - SIZE * 2 + 1}`;
}

function explanation(step: LogicalStep): string {
  const [digit, otherDigit] = step.digits;
  const unit = step.unit === undefined ? '' : unitName(step.unit);
  const cell = step.pattern[0];
  switch (step.kind) {
    case 'naked-single':
      return `У клітинці в рядку ${rowOf(cell) + 1} і стовпці ${columnOf(cell) + 1} може стояти лише цифра ${digit}.`;
    case 'hidden-single':
      return `У ${unit} цифра ${digit} може стояти лише в одній клітинці.`;
    case 'locked-candidates':
      return `У ${unit} усі можливі позиції цифри ${digit} лежать на перетині з іншою групою. У решті клітинок цієї групи цифру ${digit} можна викреслити.`;
    case 'naked-pair':
      return `У двох клітинках у ${unit} залишилися лише ${digit} і ${otherDigit}. Викресли ці цифри з решти клітинок цієї групи.`;
    case 'hidden-pair':
      return `У ${unit} цифри ${digit} і ${otherDigit} можуть стояти лише у двох позначених клітинках. Викресли з них решту кандидатів.`;
    case 'x-wing':
      return `У двох паралельних лініях цифра ${digit} має лише по дві позиції, і вони утворюють прямокутник. Викресли цю цифру з інших клітинок двох перехресних ліній.`;
  }
}

export function nextHint(board: Board, explainedEliminations = 0): LogicalHint | null {
  const candidates = initialCandidates(board);
  if (!candidates || hasEmptyCandidateSet(board, candidates)) return null;
  let step = findLogicalStep(candidates);
  for (let shown = 0; shown < explainedEliminations && step && !step.placement; shown++) {
    applyEliminations(candidates, step);
    step = findLogicalStep(candidates);
  }
  if (!step || !solve(board)) return null;
  return {
    ...step,
    technique: TECHNIQUE_LABELS[step.kind],
    explanation: explanation(step),
    cells: [...new Set([...step.pattern, ...step.eliminations.map(({ cell }) => cell)])],
  };
}
