// Period options for the teacher Challenges → Leaderboard tab.
// The leaderboard service ranks by XP earned in the chosen range
// (GET /student/leaderboard?period=...&date=...); 'all' is all-time XP.

export type LeaderboardPeriod = 'today' | 'week' | 'month' | 'custom' | 'all';

export const PERIOD_OPTIONS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'today',  label: 'Today' },
  { key: 'week',   label: 'This Week' },
  { key: 'month',  label: 'This Month' },
  { key: 'custom', label: 'Custom Date' },
  { key: 'all',    label: 'All Time' },
];

export const DEFAULT_PERIOD: LeaderboardPeriod = 'week';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n: number) { return String(n).padStart(2, '0'); }

/** Local calendar day as 'YYYY-MM-DD' (what the DatePicker uses). */
export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** '2026-11-05' → '5 Nov 2026' */
export function formatDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Heading for the podium panel, e.g. "Top Performers Today". */
export function topPerformersTitle(period: LeaderboardPeriod, customDate: string): string {
  switch (period) {
    case 'today':  return 'Top Performers Today';
    case 'week':   return 'Top Performers This Week';
    case 'month':  return 'Top Performers This Month';
    case 'custom': return customDate ? `Top Performers on ${formatDateKey(customDate)}` : 'Top Performers';
    default:       return 'Top Performers (All Time)';
  }
}

/** Label for the XP stat card. */
export function xpStatLabel(period: LeaderboardPeriod, customDate: string): string {
  switch (period) {
    case 'today':  return 'XP Earned Today';
    case 'week':   return 'XP Earned This Week';
    case 'month':  return 'XP Earned This Month';
    case 'custom': return customDate ? `XP Earned on ${formatDateKey(customDate)}` : 'XP Earned';
    default:       return 'Total XP Earned';
  }
}

/** Days left in the current week (Mon–Sun) or month, counting today. */
export function daysLeftInPeriod(period: 'week' | 'month', now: Date = new Date()): number {
  if (period === 'week') {
    const dow = now.getDay(); // 0 = Sunday
    return dow === 0 ? 1 : 8 - dow;
  }
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate() + 1;
}
