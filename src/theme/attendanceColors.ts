import type { AppColors } from './index';

export type AttendanceTone = 'present' | 'absent' | 'late' | 'unmarked';

// Aivorah tokens for attendance statuses: sage / rose / gold / dim.
export function attendanceColor(colors: AppColors, status: string | null | undefined): string {
  if (status === 'present') return colors.accentGreen;
  if (status === 'absent') return colors.accentRed;
  if (status === 'late') return colors.accentYellow;
  return colors.textDim;
}

// Tinted surface + border for a status card / pill.
export function attendanceTone(colors: AppColors, status: string | null | undefined) {
  const fg = attendanceColor(colors, status);
  return { fg, bg: `${fg}18`, border: `${fg}40` };
}
