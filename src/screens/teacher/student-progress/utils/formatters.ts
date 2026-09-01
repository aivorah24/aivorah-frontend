export function minutesLabel(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${(mins / 60).toFixed(1)}h`;
}

export function secondsLabel(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

export function lastActiveLabel(dateStr?: string | null): string {
  if (!dateStr) return 'Never';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days < 0) return 'Today';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export function initials(name: string): string {
  return (name || '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

// Header's "Updated X ago" — a real timestamp of the last successful fetch,
// never a fake "live" indicator. `null` means no successful load has
// happened yet (e.g. still loading, or every attempt has failed).
export function updatedAgoLabel(lastRefreshedAt: number | null): string {
  if (lastRefreshedAt == null) return 'Not loaded yet';
  const seconds = Math.floor((Date.now() - lastRefreshedAt) / 1000);
  if (seconds < 5) return 'Updated just now';
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `Updated ${hours}h ago`;
}
