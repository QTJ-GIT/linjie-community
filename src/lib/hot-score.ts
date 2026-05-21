export function hotScore(score: number, createdAt: string): number {
  const order = Math.log10(Math.max(Math.abs(score), 1));
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
  const seconds = new Date(createdAt).getTime() / 1000 - 1700000000;
  return order + (sign * seconds) / 45000;
}
