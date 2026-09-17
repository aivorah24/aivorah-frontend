import type { AppColors } from '../../../../theme';

/**
 * Returns the appropriate color tint for a student status badge.
 * Uses theme-independent true colors for better contrast.
 */
export function statusTint(colors: AppColors, status: string): string {
  if (status === 'active') return '#2F9E44';
  if (status === 'invited') return colors.accentYellow;
  if (status === 'inactive') return '#6B7280';
  return '#DC2626'; // archived
}

/**
 * Format a joinedAt ISO date as a relative time string.
 * - "Today" if less than 1 day ago
 * - "Nd ago" if less than 30 days ago
 * - Full date otherwise
 */
export function formatJoined(iso: string): string {
  try {
    const d = new Date(iso);
    const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diffDays < 1) return 'Today';
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

/**
 * Format a lastActiveAt ISO date as a relative time string.
 * - null/invalid → "Never signed in"
 * - "Today" if less than 1 day ago
 * - "Yesterday" if exactly 1 day ago
 * - "N days ago" if less than 30 days ago
 * - Full date otherwise
 */
export function formatLastActive(iso: string | null): string {
  if (!iso) return 'Never signed in';
  try {
    const d = new Date(iso);
    const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return 'Never signed in';
  }
}
