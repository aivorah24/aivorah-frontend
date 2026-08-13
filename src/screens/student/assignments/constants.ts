import type { StepType } from './types';

export const FILTERS = ['All', 'Pending', 'Completed', 'Quizzes'];

// Aivorah Enchanting Forest pastel palette for step types
export const STEP_COLORS: Record<StepType, string> = {
  // Core
  brainstorm:           '#C5BD96',  // khaki gold
  drawing:              '#D4A898',  // warm peach
  structured_writing:   '#9FB2A4',  // slate teal
  problem_solving:      '#C3DCD8',  // sage mint
  // Maths
  tuning_in:            '#C5BD96',  // gold cream
  math_reflection:      '#C3DCD8',  // sage mint
  // Science
  prior_knowledge:      '#EBD5B8',  // warm sand
  // English
  text_connection:      '#E2D4B8',  // gold sand
  reading_comprehension:'#C5BD96',  // gold cream
  writing_reflection:   '#C5BD96',  // khaki gold
  // Language Acquisition
  language_culture:     '#D4C4A8',  // linen
  language_practice:    '#C3DCD8',  // sage mint
  communication:        '#C8D4A8',  // sage green
  // Social Studies
  social_inquiry:       '#D8C8A8',  // wheat
  research_notes:       '#C5BD96',  // gold cream
  social_synthesis:     '#C4D0C4',  // silver sage
  // Visual Arts
  artistic_exploration: '#E2D4B8',  // gold sand
  art_creation:         '#D4C4A8',  // linen
  artistic_reflection:  '#D4C4A8',  // linen
  // ICT
  digital_awareness:    '#C5BD96',  // gold cream
  tech_skill_practice:  '#C3DCD8',  // sage mint
  digital_citizenship:  '#C4D0C4',  // silver sage
  // PE
  movement_exploration: '#C8D8B8',  // fern
  skill_practice:       '#C3DCD8',  // sage mint
  physical_reflection:  '#D0D8C0',  // sage
};

export const STEP_TEXT_COLORS: Record<StepType, string> = {
  brainstorm:           '#8A7E4A',
  drawing:              '#8C5A49',
  structured_writing:   '#3D6B66',
  problem_solving:      '#3D7A74',
  tuning_in:            '#8A7E4A',
  math_reflection:      '#3D7A74',
  prior_knowledge:      '#8A6030',
  text_connection:      '#7A6040',
  reading_comprehension:'#8A7E4A',
  writing_reflection:   '#8A7E4A',
  language_culture:     '#7A6040',
  language_practice:    '#3D7A74',
  communication:        '#4A6A30',
  social_inquiry:       '#7A6030',
  research_notes:       '#8A7E4A',
  social_synthesis:     '#4A6050',
  artistic_exploration: '#7A6040',
  art_creation:         '#7A6040',
  artistic_reflection:  '#7A6040',
  digital_awareness:    '#8A7E4A',
  tech_skill_practice:  '#3D7A74',
  digital_citizenship:  '#4A6050',
  movement_exploration: '#3A6040',
  skill_practice:       '#3D7A74',
  physical_reflection:  '#4A6030',
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
  Mathematics:           '#9FB2A4',  // sage
  Science:               '#C3DCD8',  // sage mint
  English:               '#E2D4B8',  // gold sand
  'Social Studies':      '#C5BD96',  // khaki gold
  'Language Acquisition':'#D4C4A8',  // linen
  'Visual Arts':         '#D4C4A8',  // linen
  ICT:                   '#C5BD96',  // gold cream
  'Physical Education':  '#C8D8B8',  // fern
};

// ── Stamp config ─────────────────────────────────────────────────────────────
export const STAMPS = [
  { id: 'amazing',    label: 'Amazing Storyteller', icon: 'star',         color: '#f59e0b', min: 80 },
  { id: 'hardworking',label: 'Hardworking Farmer',  icon: 'award',        color: '#10b981', min: 60 },
  { id: 'keepgoing',  label: 'Keep Going!',          icon: 'trending-up',  color: '#BAA467', min: 0  },
];
