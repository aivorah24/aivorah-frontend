import type { StepType, TaskStep } from './types';

export const TABS = ['All', 'Active', 'Completed'];
export const SUBJECTS = [
  'Mathematics', 'Science', 'English', 'Social Studies', 'Language Acquisition',
  'Visual Arts', 'ICT', 'Physical Education',
];
export const ALL_GRADES = ['Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];
export const IB_GRADES  = ['Grade 3', 'Grade 4', 'Grade 5'];
const INDIAN_LANGUAGES = [
  'Hindi', 'Sanskrit', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Bengali', 'Assamese', 'Gujarati',
  'Marathi', 'Punjabi', 'Odia', 'Urdu', 'Nepali',
];
// Second languages each board offers (CBSE scheme of studies, CISCE Group I,
// IB MYP eAssessment, Cambridge IGCSE foreign/second language syllabuses).
export const LANGUAGES_BY_CURRICULUM: Record<string, string[]> = {
  CBSE: [...INDIAN_LANGUAGES, 'Persian', 'Arabic', 'French', 'German', 'Spanish', 'Japanese', 'Russian', 'Thai'],
  ICSE: [...INDIAN_LANGUAGES, 'French', 'German', 'Spanish'],
  IB: ['Hindi', 'French', 'Spanish', 'German', 'Mandarin', 'Arabic', 'Urdu', 'Dutch', 'Japanese'],
  Cambridge: ['Hindi', 'Urdu', 'French', 'German', 'Spanish', 'Mandarin', 'Arabic', 'Japanese', 'Italian', 'Portuguese', 'Dutch', 'Greek'],
};
export const LANGUAGES = Array.from(new Set(Object.values(LANGUAGES_BY_CURRICULUM).flat()));

export function languagesForCurriculum(curriculum?: string | null): string[] {
  const c = String(curriculum || '').trim().toUpperCase();
  if (c.startsWith('IB')) return LANGUAGES_BY_CURRICULUM.IB;
  if (c.startsWith('CAMBRIDGE') || c.includes('IGCSE')) return LANGUAGES_BY_CURRICULUM.Cambridge;
  if (c === 'ICSE' || c === 'ISC' || c === 'CISCE') return LANGUAGES_BY_CURRICULUM.ICSE;
  if (c === 'CBSE') return LANGUAGES_BY_CURRICULUM.CBSE;
  return LANGUAGES;
}
// Subjects each board teaches at each stage. Values stay the app's canonical
// names ('Language Acquisition' drives the language picker); boards' own names
// are shown via subjectLabel().
const LANG = 'Language Acquisition';
type Board = 'CBSE' | 'ICSE' | 'IB' | 'Cambridge';
const SUBJECTS_BY_STAGE: Record<Board, Array<{ upTo: number; subjects: string[] }>> = {
  CBSE: [
    { upTo: 2,  subjects: ['English', LANG, 'Mathematics', 'Visual Arts', 'Physical Education'] },
    { upTo: 5,  subjects: ['English', LANG, 'Mathematics', 'Environmental Studies', 'Visual Arts', 'Physical Education'] },
    { upTo: 8,  subjects: ['English', LANG, 'Mathematics', 'Science', 'Social Studies', 'ICT', 'Visual Arts', 'Physical Education'] },
    { upTo: 10, subjects: ['English', LANG, 'Mathematics', 'Science', 'Social Studies', 'ICT', 'Physical Education'] },
    { upTo: 12, subjects: ['English', LANG, 'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 'Accountancy', 'Business Studies', 'Economics', 'History', 'Geography', 'Political Science', 'Physical Education'] },
  ],
  ICSE: [
    { upTo: 5,  subjects: ['English', LANG, 'Mathematics', 'Environmental Studies', 'ICT', 'Visual Arts', 'Physical Education'] },
    { upTo: 10, subjects: ['English', LANG, 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History & Civics', 'Geography', 'ICT', 'Economics', 'Visual Arts', 'Physical Education'] },
    { upTo: 12, subjects: ['English', LANG, 'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 'Accountancy', 'Business Studies', 'Economics', 'History', 'Geography', 'Political Science', 'Physical Education'] },
  ],
  IB: [
    { upTo: 5,  subjects: ['Mathematics', 'Science', 'English', 'Social Studies', LANG, 'Visual Arts', 'ICT', 'Physical Education'] },
    { upTo: 10, subjects: ['English', LANG, 'Social Studies', 'Science', 'Mathematics', 'Visual Arts', 'Physical Education', 'Design'] },
    { upTo: 12, subjects: ['English', LANG, 'Economics', 'History', 'Geography', 'Business Management', 'Psychology', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Mathematics', 'Visual Arts', 'Theory of Knowledge'] },
  ],
  Cambridge: [
    { upTo: 9,  subjects: ['English', LANG, 'Mathematics', 'Science', 'Global Perspectives', 'ICT', 'Visual Arts', 'Physical Education'] },
    { upTo: 12, subjects: ['English', LANG, 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics', 'Business Studies', 'History', 'Geography', 'Global Perspectives', 'Visual Arts'] },
  ],
};

// Board-specific names for the canonical subjects (stage-aware where boards differ)
const SUBJECT_LABELS: Record<Board, (s: string, g: number) => string | undefined> = {
  CBSE: (s, g) => ({ [LANG]: 'Second Language', 'Social Studies': 'Social Science', ICT: g >= 9 ? 'Information Technology' : 'Computer Science', 'Visual Arts': 'Art Education', 'Environmental Studies': g >= 3 ? 'The World Around Us (EVS)' : undefined } as Record<string, string | undefined>)[s],
  ICSE: (s, g) => ({ [LANG]: 'Second Language', ICT: g >= 9 ? 'Computer Applications' : 'Computer Studies', 'Visual Arts': 'Art', 'Environmental Studies': 'EVS' } as Record<string, string | undefined>)[s],
  IB: (s, g) => (g <= 5 ? undefined : ({ English: 'Language and Literature', 'Social Studies': 'Individuals and Societies', Science: 'Sciences', 'Visual Arts': 'Arts', 'Physical Education': 'Physical and Health Education' } as Record<string, string>)[s]),
  Cambridge: (s, g) => ({ [LANG]: 'Foreign Language', ICT: 'Computing', 'Visual Arts': 'Art & Design', ...(g >= 10 ? { ICT: 'Computer Science' } : {}) } as Record<string, string>)[s],
};

function boardOf(curriculum?: string | null): Board | null {
  const c = String(curriculum || '').trim().toUpperCase();
  if (c.startsWith('IB')) return 'IB';
  if (c.startsWith('CAMBRIDGE') || c.includes('IGCSE')) return 'Cambridge';
  if (c === 'ICSE' || c === 'ISC' || c === 'CISCE') return 'ICSE';
  if (c === 'CBSE' || c.includes('NCERT')) return 'CBSE';
  return null;
}

// 'Grade 7' → 7; LKG/UKG/Nursery → 0
export function gradeNumber(grade?: string | null): number | null {
  const g = String(grade || '').trim();
  if (/^(nursery|pre|lkg|ukg|kg)/i.test(g)) return 0;
  const n = parseInt(g.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export function subjectsFor(curriculum?: string | null, grade?: string | null): string[] {
  const board = boardOf(curriculum);
  if (!board) return SUBJECTS;
  const stages = SUBJECTS_BY_STAGE[board];
  const g = gradeNumber(grade);
  // Unknown grade → the youngest stage
  const stage = g === null ? stages[0] : (stages.find(s => g <= s.upTo) || stages[stages.length - 1]);
  return stage.subjects;
}

export function subjectLabel(subject: string, curriculum?: string | null, grade?: string | null): string {
  const board = boardOf(curriculum);
  if (!board) return subject;
  return SUBJECT_LABELS[board](subject, gradeNumber(grade) ?? 0) || subject;
}

export const TYPES = ['assignment', 'quiz'];
// Aivorah gold — matches the gold theme applied across teacher/parent/student screens
export const AIVORAH_GOLD = '#BAA467';
export const SUBJECT_COLORS: Record<string, string> = {
  Mathematics:    AIVORAH_GOLD,
  Science:        AIVORAH_GOLD,
  English:        AIVORAH_GOLD,
  'Social Studies': AIVORAH_GOLD,
  'Language Acquisition': AIVORAH_GOLD,
  'Visual Arts':          AIVORAH_GOLD,
  'ICT':                  AIVORAH_GOLD,
  'Physical Education':   AIVORAH_GOLD,
};

export const STEP_DEFAULTS: Record<StepType, Partial<TaskStep>> = {
  brainstorm:           { label: 'Thinking Clouds',         instructions: 'Write keywords that come to mind.', sections: [], wordBank: [] },
  drawing:              { label: 'Draw Your Answer',         instructions: 'Draw and label your answer.', sections: [], wordBank: [] },
  structured_writing:   { label: 'Write a Response',        instructions: 'Write with a clear beginning, middle, and end.', sections: ['Beginning', 'Middle', 'End'], wordBank: [] },
  problem_solving:      { label: 'Practice Problems',        instructions: 'Solve each problem. Show your working.', sections: [], wordBank: [], problems: [] },
  tuning_in:            { label: 'Tuning In',                instructions: 'Read the scenario and write your initial thinking.', sections: [], wordBank: [], provocation: '' },
  math_reflection:      { label: 'Math Reflection',          instructions: 'Reflect using the three prompts below.', sections: ['My Strategy', 'What Was Tricky', 'Real Life Connection'], wordBank: [], reflectionPrompts: [] },
  prior_knowledge:      { label: 'Prior Knowledge',          instructions: 'Write what you know and what you predict.', sections: ['What I Already Know', 'What I Predict'], wordBank: [] },
  text_connection:      { label: 'Text Connection',          instructions: 'Read and write your personal connection to the text.', sections: [], wordBank: [], provocation: '' },
  reading_comprehension:{ label: 'Reading Comprehension',    instructions: 'Answer the questions about the text.', sections: ['What Happened?', 'Reading Between the Lines', 'My Thinking'], wordBank: [] },
  writing_reflection:   { label: 'Writing Reflection',       instructions: 'Reflect on your reading using the three prompts.', sections: ['Most Important Idea', 'Connection to Our Unit', 'My Question for the Author'], wordBank: [], reflectionPrompts: [] },
  language_culture:     { label: 'Language & Culture',        instructions: 'Explore the language and cultural connection.', sections: [], wordBank: [], provocation: '' },
  language_practice:    { label: 'Language Practice',         instructions: 'Practise vocabulary and write in the target language.', sections: ['Vocabulary Practice', 'My Sentences', 'Cultural Connection'], wordBank: [] },
  communication:        { label: 'Communication',             instructions: 'Write a paragraph and reflect on your language learning.', sections: ['My Paragraph', 'Favourite Word or Phrase', 'Cultural Comparison'], wordBank: [], reflectionPrompts: [] },
  social_inquiry:       { label: 'Social Inquiry',            instructions: 'Observe and wonder about the provocation.', sections: [], wordBank: [], provocation: '' },
  research_notes:       { label: 'Research Notes',            instructions: 'Research and record notes in each section.', sections: ['Key Facts', 'People and Perspectives', 'Cause and Effect'], wordBank: [] },
  social_synthesis:     { label: 'Social Synthesis',          instructions: 'Synthesise your learning using the three prompts.', sections: ['What I Learned and Why It Matters', 'Connection to Our World', 'Taking Action'], wordBank: [], reflectionPrompts: [] },
  artistic_exploration: { label: 'Art Exploration',           instructions: 'Observe the artwork and write your response.', sections: [], wordBank: [], provocation: '' },
  art_creation:         { label: 'Art Creation',              instructions: 'Create your artwork and upload a photo.', sections: [], wordBank: [] },
  artistic_reflection:  { label: 'Artist Statement',          instructions: 'Reflect on your artwork using the three prompts.', sections: ['About My Artwork', 'What I Was Trying to Express', 'Challenges and Improvements'], wordBank: [], reflectionPrompts: [] },
  digital_awareness:    { label: 'Digital Awareness',         instructions: 'Explore technology use and write your response.', sections: [], wordBank: [], provocation: '' },
  tech_skill_practice:  { label: 'Tech Skill Practice',       instructions: 'Complete the digital task and describe your creation.', sections: ['Step-by-Step Task', 'My Digital Creation', 'How I Checked My Sources'], wordBank: [] },
  digital_citizenship:  { label: 'Digital Citizenship',       instructions: 'Reflect on responsible technology use.', sections: ['What I Learned to Do', 'Being a Responsible Digital Citizen', 'Technology for Good'], wordBank: [], reflectionPrompts: [] },
  movement_exploration: { label: 'Movement Exploration',      instructions: 'Write about the movement concept.', sections: [], wordBank: [], provocation: '' },
  skill_practice:       { label: 'Skill Practice',            instructions: 'Describe and record your physical practice.', sections: ['Key Skill Steps', 'My Practice Record', 'Teamwork and Fairness'], wordBank: [] },
  physical_reflection:  { label: 'PE Reflection',             instructions: 'Reflect on your physical learning and set goals.', sections: ['What I Did Well', 'My Next Step', 'Health and Wellbeing Connection'], wordBank: [], reflectionPrompts: [] },
};
export const STEP_ICONS: Record<StepType, string> = {
  brainstorm: 'cloud', drawing: 'edit-3', structured_writing: 'align-left', problem_solving: 'hash',
  tuning_in: 'zap', math_reflection: 'rotate-ccw', prior_knowledge: 'bookmark',
  text_connection: 'book-open', reading_comprehension: 'search', writing_reflection: 'feather',
  language_culture: 'globe', language_practice: 'message-circle', communication: 'edit-3',
  social_inquiry: 'compass', research_notes: 'file-text', social_synthesis: 'layers',
  artistic_exploration: 'eye', art_creation: 'edit-3', artistic_reflection: 'aperture',
  digital_awareness: 'monitor', tech_skill_practice: 'cpu', digital_citizenship: 'shield',
  movement_exploration: 'activity', skill_practice: 'trending-up', physical_reflection: 'heart',
};
export const STEP_COLORS: Record<StepType, string> = {
  brainstorm: AIVORAH_GOLD, drawing: AIVORAH_GOLD, structured_writing: AIVORAH_GOLD, problem_solving: AIVORAH_GOLD,
  tuning_in: AIVORAH_GOLD, math_reflection: AIVORAH_GOLD, prior_knowledge: AIVORAH_GOLD,
  text_connection: AIVORAH_GOLD, reading_comprehension: AIVORAH_GOLD, writing_reflection: AIVORAH_GOLD,
  language_culture: AIVORAH_GOLD, language_practice: AIVORAH_GOLD, communication: AIVORAH_GOLD,
  social_inquiry: AIVORAH_GOLD, research_notes: AIVORAH_GOLD, social_synthesis: AIVORAH_GOLD,
  artistic_exploration: AIVORAH_GOLD, art_creation: AIVORAH_GOLD, artistic_reflection: AIVORAH_GOLD,
  digital_awareness: AIVORAH_GOLD, tech_skill_practice: AIVORAH_GOLD, digital_citizenship: AIVORAH_GOLD,
  movement_exploration: AIVORAH_GOLD, skill_practice: AIVORAH_GOLD, physical_reflection: AIVORAH_GOLD,
};
