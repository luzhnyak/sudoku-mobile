import { elapsedTime } from '../../src/gameClock/activeTime';

it('uses only the current active interval and a saved checkpoint', () => {
  const checkpoint = elapsedTime(3000, 5000, 7000);
  expect(checkpoint).toBe(5000);
  expect(elapsedTime(checkpoint, null, 15_000)).toBe(checkpoint);
  expect(elapsedTime(checkpoint, 15_000, 17_500)).toBe(7500);
  expect(elapsedTime(checkpoint, 5000, 4000)).toBe(checkpoint);
});
