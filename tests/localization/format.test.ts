import { formatDays } from '../../src/utils/format';

test.each([
  [0, '0 днів'], [1, '1 день'], [2, '2 дні'], [5, '5 днів'], [11, '11 днів'],
  [12, '12 днів'], [14, '14 днів'], [21, '21 день'], [22, '22 дні'], [111, '111 днів'],
])('formats a Ukrainian streak of %i days', (days, expected) => {
  expect(formatDays(days)).toBe(expected);
});
