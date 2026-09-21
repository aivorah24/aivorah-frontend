import type { AppColors } from '../../../../theme';

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function statusTone(colors: AppColors, status: string): { dot: string; text: string; bg: string } {
  if (status === 'Completed') return { dot: colors.accentGreen, text: colors.accentGreen, bg: `${colors.accentGreen}22` };
  if (status === 'Failed') return { dot: colors.accentRed, text: colors.accentRed, bg: `${colors.accentRed}22` };
  return { dot: colors.accentYellow, text: colors.accentYellow, bg: `${colors.accentYellow}26` };
}
