import type { StepType, TaskStep } from './types';

export const TABS = ['All', 'Active', 'Completed'];
export const SUBJECTS = [
  'Mathematics', 'Science', 'English', 'Social Studies', 'Language Acquisition',
  'Visual Arts', 'ICT', 'Physical Education',
];
export const ALL_GRADES = ['Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];
export const IB_GRADES  = ['Grade 3', 'Grade 4', 'Grade 5'];
export const LANGUAGES = [
  'Telugu', 'Hindi', 'Tamil', 'Kannada', 'Malayalam', 'Bengali', 'Gujarati', 'Marathi', 'Punjabi', 'Odia',
  'Urdu', 'Sanskrit', 'French', 'Spanish', 'German', 'Mandarin', 'Arabic',
];
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
  brainstorm: '#C5BD96', drawing: '#D4A898', structured_writing: '#93B0AC', problem_solving: '#C3DCD8',
  tuning_in: '#D8C4E8', math_reflection: '#B8D4C8', prior_knowledge: '#EBD5B8',
  text_connection: '#EAD4D8', reading_comprehension: '#D8C4E8', writing_reflection: '#C5BD96',
  language_culture: '#D4C4A8', language_practice: '#B8CCD4', communication: '#C8D4A8',
  social_inquiry: '#D8C8A8', research_notes: '#B8C8D8', social_synthesis: '#C4D0C4',
  artistic_exploration: '#E8D4C4', art_creation: '#D4A898', artistic_reflection: '#DCC8D4',
  digital_awareness: '#C4D4E0', tech_skill_practice: '#B8D8D0', digital_citizenship: '#C0CCD8',
  movement_exploration: '#C8D8B8', skill_practice: '#B8D4BC', physical_reflection: '#D0D8C0',
};
