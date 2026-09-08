import type { SubjectMeta } from './types';

// Subject meta - light pastels
export const SUBJECT_META: Record<string, SubjectMeta> = {
  Mathematics:          { icon: 'trending-up',
    accentDark: '#4A9E9A', bgFromDark: '#B8DDD8', bgToDark: '#C8EAE6',
    accentLight: '#4A9E9A', bgFromLight: '#B8DDD8', bgToLight: '#C8EAE6' },
  Science:              { icon: 'zap',
    accentDark: '#4A9E70', bgFromDark: '#B0D8C0', bgToDark: '#C4E8D4',
    accentLight: '#4A9E70', bgFromLight: '#B0D8C0', bgToLight: '#C4E8D4' },
  'Social Studies':     { icon: 'globe',
    accentDark: '#A89840', bgFromDark: '#E0D898', bgToDark: '#EEE8B4',
    accentLight: '#A89840', bgFromLight: '#E0D898', bgToLight: '#EEE8B4' },
  English:              { icon: 'book-open',
    accentDark: '#C85870', bgFromDark: '#F0C8D0', bgToDark: '#F8D8E0',
    accentLight: '#C85870', bgFromLight: '#F0C8D0', bgToLight: '#F8D8E0' },
  Arts:                 { icon: 'feather',
    accentDark: '#C87848', bgFromDark: '#F0C8A8', bgToDark: '#F8D8BC',
    accentLight: '#C87848', bgFromLight: '#F0C8A8', bgToLight: '#F8D8BC' },
  'Physical Education': { icon: 'activity',
    accentDark: '#C84868', bgFromDark: '#F0B8C8', bgToDark: '#F8CCD8',
    accentLight: '#C84868', bgFromLight: '#F0B8C8', bgToLight: '#F8CCD8' },
  ICT:                  { icon: 'monitor',
    accentDark: '#3A9896', bgFromDark: '#A8D8D8', bgToDark: '#BCE8E8',
    accentLight: '#3A9896', bgFromLight: '#A8D8D8', bgToLight: '#BCE8E8' },
};

export function subjectMeta(subject: string): SubjectMeta {
  return SUBJECT_META[subject] ?? {
    icon: 'book',
    accentDark: '#4A9E9A', bgFromDark: '#B8DDD8', bgToDark: '#C8EAE6',
    accentLight: '#4A9E9A', bgFromLight: '#B8DDD8', bgToLight: '#C8EAE6',
  };
}

export function formatStudyTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
