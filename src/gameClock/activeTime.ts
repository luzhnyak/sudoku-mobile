export function elapsedTime(savedMs: number, startedAt: number | null, now: number): number {
  return savedMs + (startedAt === null ? 0 : Math.max(0, Math.floor(now - startedAt)));
}
