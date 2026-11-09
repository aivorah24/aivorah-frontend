import type { AgeGroup, Category, QuestionType } from '../../../services/currentAffairsApi';

// Current Affairs palette — Aivorah gold plus one colour per subject.
export const BRAND = {
  gold: '#B4A467',
  rose: '#E8748A',
  blue: '#5B9BD5',
  purple: '#8B6FB0',
  forest: '#5B9B6F',
  orange: '#E89B5B',
  teal: '#5BB0A0',
};

// Soft card backgrounds matching BRAND (light mode).
export const PASTEL = {
  gold: '#F4EFDC',
  rose: '#FBE6EA',
  blue: '#E3EEF8',
  purple: '#EDE7F4',
  forest: '#E2F0E6',
  orange: '#FBEADC',
  teal: '#DFF1EE',
};

type Tone = keyof typeof BRAND;

export const CATEGORIES: Record<Category, { label: string; emoji: string; tone: Tone }> = {
  india: { label: 'India', emoji: '🇮🇳', tone: 'orange' },
  world: { label: 'World', emoji: '🌍', tone: 'blue' },
  economy: { label: 'Economy', emoji: '💰', tone: 'gold' },
  science: { label: 'Science & Tech', emoji: '🔬', tone: 'purple' },
  environment: { label: 'Environment', emoji: '🌱', tone: 'forest' },
  sports: { label: 'Sports & Achievements', emoji: '🏆', tone: 'rose' },
  society: { label: 'Society & Culture', emoji: '🧑‍🤝‍🧑', tone: 'teal' },
};

export const AGE_GROUPS: Record<AgeGroup, { label: string; storiesPerDay: number; minutes: string }> = {
  'under-8': { label: 'Ages 3-8', storiesPerDay: 3, minutes: '3-5' },
  '8-12': { label: 'Ages 8-12', storiesPerDay: 10, minutes: '5-7' },
  '13+': { label: 'Ages 13+', storiesPerDay: 18, minutes: '7-10' },
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

export function categoryColors(category: Category, isDark: boolean) {
  const tone = CATEGORIES[category]?.tone || 'gold';
  return { fg: BRAND[tone], bg: isDark ? `${BRAND[tone]}26` : PASTEL[tone] };
}

export function formatReadTime(seconds: number): string {
  if (!seconds || seconds < 60) return `${Math.max(30, Math.round(seconds || 0))} sec read`;
  const mins = Math.round(seconds / 60);
  return `${mins} min read`;
}

export function formatDigestDate(date: string | null): string {
  if (!date) return '';
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}
