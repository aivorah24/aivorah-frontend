export const TIME_OPTIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 15);
export const WEEKLY_OPTIONS = [120, 150, 180, 210, 240, 270, 300, 360, 420, 480, 600];
export const BREAK_INTERVALS = [20, 25, 30, 40, 45, 60];
export const BREAK_DURATIONS = [3, 5, 10];
export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

export const DEFAULT_LIMITS: Record<string, number> = {
  'Grade 1': 30, 'Grade 2': 30, 'Grade 3': 45, 'Grade 4': 45,
  'Grade 5': 60, 'Grade 6': 60, 'Grade 7': 90, 'Grade 8': 90,
  'Grade 9': 120, 'Grade 10': 120, 'Grade 11': 120, 'Grade 12': 120,
};
