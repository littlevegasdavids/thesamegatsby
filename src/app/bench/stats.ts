export type Summary = { runs: number; median: number | undefined; worst: number | undefined };

export function summarise(times: readonly number[]): Summary {
  if (times.length === 0) return { runs: 0, median: undefined, worst: undefined };
  const sorted = [...times].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { runs: sorted.length, median, worst: sorted.at(-1) };
}
