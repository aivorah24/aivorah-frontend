import { Feather } from '@expo/vector-icons';

// ── Enchanting Forest palette ──────────────────────────────
// Slightly darkened for use as text/icon on white backgrounds
// Exact landing.html palette: SAGE (#9FB2A4) + GOLD (#BAA467) on #0B0B0B. No purple.
export const BRAND = {
  teal:   '#BAA467',   // landing --sage (primary)
  mint:   '#BAA467',   // sage
  rose:   '#C98A8A',   // muted rose (kept for "wrong answer" semantics)
  blush:  '#C99A9A',   // mid-rose
  gold:   '#BAA467',   // landing --gold
  slate:  '#BAA467',   // sage
  silver: '#A9B0AC',   // landing --muted
  // Accents — sage/gold family (no purples/corals)
  violet: '#BAA467',   // → gold
  coral:  '#C9A24E',   // deep gold
  forest: '#BAA467',   // sage
  // Aliases used elsewhere in code
  indigo: '#BAA467',
  violet2: '#BAA467',  // gold
  purple: '#BAA467',   // → gold
  orange: '#C9A24E',   // deep gold
  amber:  '#BAA467',   // landing GOLD
  green:  '#BAA467',   // sage
  cyan:   '#BAA467',   // sage
  blue:   '#BAA467',
  red:    '#C98A8A',   // muted rose
  pink:   '#C98A8A',
};

// Light-mode pastel card backgrounds — warm cream + sage/gold tints.
export const PASTEL = {
  blue:   '#E7F1EA',   // pale sage
  teal:   '#D9EEE0',   // mint tint
  green:  '#DCEFE2',   // light green
  orange: '#F4ECD6',   // warm cream-gold
  yellow: '#F1EAD2',   // gold cream
  red:    '#F6E2E2',   // soft rose
  cyan:   '#DEF3E6',   // mint
  indigo: '#E7F1EA',   // pale sage
  pink:   '#F2E3D9',   // warm blush
  purple: '#F1E8D0',   // gold cream (was blush-rose)
  silver: '#ECEFEA',   // soft sage-gray
};

export const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: '#BAA467',   // gold
  Science: '#BAA467',       // gold
  'Social Studies': '#BAA467', // gold
};

export const SUBJECT_ICONS: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  Mathematics: 'hash', Science: 'zap', 'Social Studies': 'globe',
};

export const QUICK_NAV = [
  { label: 'My Learning',  icon: 'book'         as const, color: BRAND.teal,   pastel: PASTEL.teal,   screen: 'LearningPaths', desc: 'My Paths' },
  { label: 'AI Coach',     icon: 'cpu'           as const, color: BRAND.rose,   pastel: PASTEL.pink,   screen: 'AICoach',       desc: 'Ask anything' },
  { label: 'Assignments',  icon: 'check-square'  as const, color: BRAND.gold,   pastel: PASTEL.yellow, screen: 'Assignments',   desc: 'Pending' },
  { label: 'Challenges',   icon: 'target'        as const, color: BRAND.blush,  pastel: PASTEL.red,    screen: 'Challenges',    desc: 'Compete' },
  { label: 'Schedule',     icon: 'calendar'      as const, color: BRAND.silver, pastel: PASTEL.silver, screen: 'Schedule',      desc: 'Timetable' },
  { label: 'Progress',     icon: 'trending-up'   as const, color: BRAND.violet, pastel: PASTEL.purple, screen: 'Progress',      desc: 'Analytics' },
];
