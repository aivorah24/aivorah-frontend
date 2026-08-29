import { INDIA_CITIES } from '../../onboarding/OnboardingSharedFields';

// Flat, deduped, sorted list of every city across all Indian states — the
// dropdown source for the Location picker (search-to-filter, pick one).
export const ALL_CITIES = Array.from(new Set(Object.values(INDIA_CITIES).flat())).sort();

// ── Learning styles — palette colors ─────────────────────────────────────────
// All four cards share one gold accent (#C9A24E) — same "one consistent
// color, not per-item colors" treatment already applied to Progress's
// Subject Performance cards and Learning Paths' subject cards.
export const LEARNING_STYLES = [
  { id: 'visual',    label: 'Visual',    desc: 'I learn best through diagrams & images',  icon: 'eye'      as const, color: '#C9A24E' },
  { id: 'auditory',  label: 'Auditory',  desc: 'I learn best by listening & discussing',  icon: 'volume-2' as const, color: '#C9A24E' },
  { id: 'reading',   label: 'Reading',   desc: 'I learn best through reading & writing',  icon: 'book'     as const, color: '#C9A24E' },
  { id: 'hands-on',  label: 'Hands-On', desc: 'I learn best by doing & experimenting',   icon: 'tool'     as const, color: '#C9A24E' },
];

// ── Subject interests — Enchanting Forest palette ─────────────────────────────
export const SUBJECT_OPTIONS = [
  { id: 'maths',   label: 'Mathematics', color: '#9FB2A4' },  // sage
  { id: 'science', label: 'Science',     color: '#7E9A86' },  // deep sage
  { id: 'english', label: 'English',     color: '#BAA467' },  // gold
  { id: 'art',     label: 'Art',         color: '#C9A24E' },  // deep gold
  { id: 'music',   label: 'Music',       color: '#B2C2B7' },  // light sage
  { id: 'coding',  label: 'Coding',      color: '#9A7B2E' },  // amber gold
  { id: 'history', label: 'History',     color: '#C9A24E' },  // deep gold
  { id: 'sports',  label: 'Sports',      color: '#9FB2A4' },  // sage
];

export const CARTOON_OPTIONS = ['Naruto', 'Doraemon', 'Shinchan', 'Spider-Man', 'Iron Man', 'Custom...'];
