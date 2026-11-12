export type Random = () => number;

export function seededRandom(seed: string): Random {
  let state = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++) {
    state = Math.imul(state ^ seed.charCodeAt(index), 0x01000193);
  }
  // Mulberry32 with an FNV-1a seed hash. All arithmetic is reproducible at 32 bits.
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 0x100000000;
  };
}

export function shuffled<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
