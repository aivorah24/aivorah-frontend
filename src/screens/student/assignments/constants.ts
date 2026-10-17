import type { StepType } from './types';

export const FILTERS = ['All', 'Pending', 'Completed', 'Quizzes'];

// Every step uses Aivorah gold
export const STEP_COLORS: Record<StepType, string> = {
  // Core
  brainstorm:           '#BAA467',
  drawing:              '#BAA467',
  structured_writing:   '#BAA467',
  problem_solving:      '#BAA467',
  // Maths
  tuning_in:            '#BAA467',
  math_reflection:      '#BAA467',
  // Science
  prior_knowledge:      '#BAA467',
  // English
  text_connection:      '#BAA467',
  reading_comprehension:'#BAA467',
  writing_reflection:   '#BAA467',
  // Language Acquisition
  language_culture:     '#BAA467',
  language_practice:    '#BAA467',
  communication:        '#BAA467',
  // Social Studies
  social_inquiry:       '#BAA467',
  research_notes:       '#BAA467',
  social_synthesis:     '#BAA467',
  // Visual Arts
  artistic_exploration: '#BAA467',
  art_creation:         '#BAA467',
  artistic_reflection:  '#BAA467',
  // ICT
  digital_awareness:    '#BAA467',
  tech_skill_practice:  '#BAA467',
  digital_citizenship:  '#BAA467',
  // PE
  movement_exploration: '#BAA467',
  skill_practice:       '#BAA467',
  physical_reflection:  '#BAA467',
};

export const STEP_TEXT_COLORS: Record<StepType, string> = {
  brainstorm:           '#7A6420',
  drawing:              '#7A6420',
  structured_writing:   '#7A6420',
  problem_solving:      '#7A6420',
  tuning_in:            '#7A6420',
  math_reflection:      '#7A6420',
  prior_knowledge:      '#7A6420',
  text_connection:      '#7A6420',
  reading_comprehension:'#7A6420',
  writing_reflection:   '#7A6420',
  language_culture:     '#7A6420',
  language_practice:    '#7A6420',
  communication:        '#7A6420',
  social_inquiry:       '#7A6420',
  research_notes:       '#7A6420',
  social_synthesis:     '#7A6420',
  artistic_exploration: '#7A6420',
  art_creation:         '#7A6420',
  artistic_reflection:  '#7A6420',
  digital_awareness:    '#7A6420',
  tech_skill_practice:  '#7A6420',
  digital_citizenship:  '#7A6420',
  movement_exploration: '#7A6420',
  skill_practice:       '#7A6420',
  physical_reflection:  '#7A6420',
};

export const STEP_ICONS: Record<StepType, string> = {
  brainstorm:           'cloud',
  drawing:              'edit-3',
  structured_writing:   'align-left',
  problem_solving:      'hash',
  tuning_in:            'zap',
  math_reflection:      'rotate-ccw',
  prior_knowledge:      'bookmark',
  text_connection:      'book-open',
  reading_comprehension:'search',
  writing_reflection:   'feather',
  language_culture:     'globe',
  language_practice:    'message-circle',
  communication:        'mic',
  social_inquiry:       'compass',
  research_notes:       'file-text',
  social_synthesis:     'layers',
  artistic_exploration: 'eye',
  art_creation:         'edit-3',
  artistic_reflection:  'aperture',
  digital_awareness:    'monitor',
  tech_skill_practice:  'cpu',
  digital_citizenship:  'shield',
  movement_exploration: 'activity',
  skill_practice:       'trending-up',
  physical_reflection:  'heart',
};

// Aivorah pastel subject colours
export const SUBJECT_ICON: Record<string, string> = {
  Mathematics: 'hash', Science: 'zap', English: 'book-open', 'Social Studies': 'globe',
  'Language Acquisition': 'message-circle', 'Visual Arts': 'aperture',
  ICT: 'monitor', 'Physical Education': 'activity',
};

export const SUBJECT_COLOR: Record<string, string> = {
  Mathematics:           '#BAA467',
  Science:               '#BAA467',
  English:               '#BAA467',
  'Social Studies':      '#BAA467',
  'Language Acquisition':'#BAA467',
  'Visual Arts':         '#BAA467',
  ICT:                   '#BAA467',
  'Physical Education':  '#BAA467',
};

// ── Stamp config ─────────────────────────────────────────────────────────────
export const STAMPS = [
  { id: 'amazing',    label: 'Amazing Storyteller', icon: 'star',         color: '#f59e0b', min: 80 },
  { id: 'hardworking',label: 'Hardworking Farmer',  icon: 'award',        color: '#10b981', min: 60 },
  { id: 'keepgoing',  label: 'Keep Going!',          icon: 'trending-up',  color: '#BAA467', min: 0  },
];
