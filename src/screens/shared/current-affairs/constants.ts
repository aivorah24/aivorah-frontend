import type { AgeGroup, Category, QuestionType } from '../../../services/currentAffairsApi';

// Same palette as the rest of the student app (World & You, Daily Habits,
// Dashboard): Aivorah gold + sage, muted green/rose only for right/wrong answers.
export const GOLD = '#BAA467';
export const SAGE = '#9FB2A4';
export const DEEP_SAGE = '#82A896';
export const CORRECT = '#4A9E70';
export const WRONG = '#C85870';
// Light-mode tinted card background and heading colour used by World & You.
export const TINT_BG = '#F0F7F6';
export const TITLE_LIGHT = '#1C2A28';

// Feather icon per category (emoji flags don't render on Windows).
export const CATEGORIES: Record<Category, { label: string; icon: string }> = {
  india: { label: 'India', icon: 'flag' },
  world: { label: 'World', icon: 'globe' },
  economy: { label: 'Economy', icon: 'trending-up' },
  science: { label: 'Science & Tech', icon: 'cpu' },
  environment: { label: 'Environment', icon: 'feather' },
  sports: { label: 'Sports & Achievements', icon: 'award' },
  society: { label: 'Society & Culture', icon: 'users' },
};

export const AGE_GROUPS: Record<AgeGroup, { label: string; storiesPerDay: number; minutes: string }> = {
  // Spec: 5-7 stories a day (the service picks the same numbers).
  'under-8': { label: 'Ages 3-8', storiesPerDay: 5, minutes: '3-5' },
  '8-12': { label: 'Ages 8-12', storiesPerDay: 6, minutes: '5-7' },
  '13+': { label: 'Ages 13+', storiesPerDay: 7, minutes: '7-10' },
};

export const QUESTION_TYPES: Record<QuestionType, string> = {
  mcq: 'Multiple choice',
  true_false: 'True or false',
  reasoning: 'Think and reason',
};

// What the service awards (aivorah-current-affairs-service/services/rewards.js).
export const POINTS = { digest: 10, story: 5, quiz: 20, excellenceBonus: 10 };
export const EXCELLENCE_PERCENT = 80;

export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Age group from the profile grade: Nursery / LKG / UKG → under-8,
 * Grade 1-8 → 8-12, Grade 9-12 → 13+. Anything unrecognised → 8-12.
 */
export function ageGroupForGrade(grade?: string | null): AgeGroup {
  const g = String(grade || '').trim().toLowerCase();
  if (!g) return '8-12';
  if (/nursery|pre-?k|\blkg\b|\bukg\b|^kg$|kindergarten|playgroup/.test(g)) return 'under-8';
  const n = parseInt(g.match(/\d+/)?.[0] || '', 10);
  if (Number.isFinite(n) && n >= 9) return '13+';
  return '8-12';
}

export function formatReadTime(seconds: number): string {
  if (!seconds || seconds < 60) return `${Math.max(30, Math.round(seconds || 0))} sec read`;
  return `${Math.round(seconds / 60)} min read`;
}

export function formatDigestDate(date: string | null): string {
  if (!date) return '';
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}
