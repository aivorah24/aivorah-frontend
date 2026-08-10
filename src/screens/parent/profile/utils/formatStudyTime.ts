// Format as m / h / h m: 39m, 60m→1h, 90m→1h 30m, 119m→1h 59m, 120m→2h
export function formatStudyTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
