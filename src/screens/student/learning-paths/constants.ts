import type { CurriculumTopic, SubjectData, SubjectMeta } from './types';

// All subject cards share one gold accent/gradient so the grid reads as a
// uniform set (2026-08-28: previously each subject had its own color —
// Computer Science green, Hindi pink, etc. — which read as randomly
// highlighted next to the rest, same issue already fixed this way on the
// Progress screen's Subject Performance grid). Only the icon still varies
// per subject.
const GOLD_META = {
  accentDark: '#C9A24E', bgFromDark: '#E4D4A8', bgToDark: '#F0E2BC',
  accentLight: '#C9A24E', bgFromLight: '#E4D4A8', bgToLight: '#F0E2BC',
};

export const SUBJECT_META: Record<string, SubjectMeta> = {
  Mathematics: { icon: 'trending-up', ...GOLD_META },
  Science: { icon: 'zap', ...GOLD_META },
  EVS: { icon: 'sun', ...GOLD_META },
  'Social Studies': { icon: 'globe', ...GOLD_META },
  // CBSE/NCERT names this subject "Social Science" (IB PYP calls it "Social
  // Studies") — same treatment, just under the name CBSE actually sends.
  'Social Science': { icon: 'globe', ...GOLD_META },
  Hindi: { icon: 'book-open', ...GOLD_META },
  'Computer Science': { icon: 'monitor', ...GOLD_META },
  English: { icon: 'book-open', ...GOLD_META },
  Arts: { icon: 'feather', ...GOLD_META },
  'Physical Education': { icon: 'activity', ...GOLD_META },
  ICT: { icon: 'monitor', ...GOLD_META },
  'Economics & Trade': { icon: 'dollar-sign', ...GOLD_META },
};

export const IB_PYP_TOPIC_BANK: CurriculumTopic[] = [
  { grade: 'Grade 3', subject: 'Mathematics', unit: 'Number Sense', topic: 'Place Value to 1000' },
  { grade: 'Grade 3', subject: 'Mathematics', unit: 'Number Sense', topic: 'Addition & Subtraction' },
  { grade: 'Grade 3', subject: 'Mathematics', unit: 'Number Sense', topic: 'Multiplication Basics' },
  { grade: 'Grade 3', subject: 'Mathematics', unit: 'Geometry', topic: '2D and 3D Shapes' },
  { grade: 'Grade 3', subject: 'Mathematics', unit: 'Measurement', topic: 'Time and Calendar' },
  { grade: 'Grade 3', subject: 'Science', unit: 'Living Things', topic: 'Plant Life Cycles' },
  { grade: 'Grade 3', subject: 'Science', unit: 'Living Things', topic: 'Animal Habitats' },
  { grade: 'Grade 3', subject: 'Science', unit: 'Earth & Space', topic: 'Weather Patterns' },
  { grade: 'Grade 3', subject: 'Science', unit: 'Earth & Space', topic: 'Soil and Rocks' },
  { grade: 'Grade 3', subject: 'Science', unit: 'Living Things', topic: 'Food Chains' },
  { grade: 'Grade 3', subject: 'Social Studies', unit: 'Communities', topic: 'My Community & Neighbourhood' },
  { grade: 'Grade 3', subject: 'Social Studies', unit: 'Communities', topic: 'Maps and Directions' },
  { grade: 'Grade 3', subject: 'Social Studies', unit: 'Heritage', topic: 'Cultural Traditions' },
  { grade: 'Grade 3', subject: 'English', unit: 'Reading', topic: 'Story Elements' },
  { grade: 'Grade 3', subject: 'English', unit: 'Reading', topic: 'Retelling and Sequencing' },
  { grade: 'Grade 3', subject: 'English', unit: 'Reading', topic: 'Reading with Expression' },
  { grade: 'Grade 3', subject: 'English', unit: 'Writing', topic: 'Paragraphs & Punctuation' },
  { grade: 'Grade 3', subject: 'English', unit: 'Writing', topic: 'Describing Characters' },
  { grade: 'Grade 3', subject: 'English', unit: 'Writing', topic: 'Writing Instructions' },
  { grade: 'Grade 3', subject: 'English', unit: 'Grammar', topic: 'Nouns, Verbs & Adjectives' },
  { grade: 'Grade 3', subject: 'English', unit: 'Grammar', topic: 'Compound Words' },
  { grade: 'Grade 3', subject: 'English', unit: 'Grammar', topic: 'Prefixes and Suffixes' },
  { grade: 'Grade 3', subject: 'Arts', unit: 'Visual Arts', topic: 'Colour Theory & Mixing' },
  { grade: 'Grade 3', subject: 'Arts', unit: 'Music', topic: 'Rhythm and Beat' },
  { grade: 'Grade 3', subject: 'Physical Education', unit: 'Movement', topic: 'Team Sports Basics' },
  { grade: 'Grade 3', subject: 'ICT', unit: 'Digital Literacy', topic: 'Introduction to Computers' },
  { grade: 'Grade 4', subject: 'Mathematics', unit: 'Number Sense', topic: 'Fractions and Decimals' },
  { grade: 'Grade 4', subject: 'Mathematics', unit: 'Number Sense', topic: 'Multiplication & Division' },
  { grade: 'Grade 4', subject: 'Mathematics', unit: 'Data Handling', topic: 'Graphs and Statistics' },
  { grade: 'Grade 4', subject: 'Science', unit: 'Forces & Motion', topic: 'Push, Pull and Gravity' },
  { grade: 'Grade 4', subject: 'Science', unit: 'Matter', topic: 'States of Matter' },
  { grade: 'Grade 4', subject: 'Science', unit: 'Living Things', topic: 'Food Chains and Ecosystems' },
  { grade: 'Grade 4', subject: 'Social Studies', unit: 'Global Connections', topic: 'Countries and Continents' },
  { grade: 'Grade 4', subject: 'English', unit: 'Reading', topic: 'Comprehension Strategies' },
  { grade: 'Grade 4', subject: 'English', unit: 'Reading', topic: 'Reading Fluency & Inference' },
  { grade: 'Grade 4', subject: 'English', unit: 'Writing', topic: 'Narrative Writing' },
  { grade: 'Grade 4', subject: 'English', unit: 'Writing', topic: 'Descriptive Writing' },
  { grade: 'Grade 4', subject: 'English', unit: 'Writing', topic: 'Paragraphing & Organisation' },
  { grade: 'Grade 4', subject: 'English', unit: 'Grammar', topic: 'Direct and Indirect Speech' },
  { grade: 'Grade 4', subject: 'English', unit: 'Grammar', topic: 'Tenses — Past, Present & Future' },
  { grade: 'Grade 4', subject: 'English', unit: 'Grammar', topic: 'Conjunctions and Connectives' },
  { grade: 'Grade 4', subject: 'English', unit: 'Grammar', topic: 'Punctuation — Commas, Apostrophes & Speech Marks' },
  { grade: 'Grade 4', subject: 'English', unit: 'Vocabulary', topic: 'Synonyms & Antonyms' },
  { grade: 'Grade 4', subject: 'Arts', unit: 'Visual Arts', topic: 'Perspective Drawing' },
  { grade: 'Grade 4', subject: 'ICT', unit: 'Digital Literacy', topic: 'Internet Safety' },
  { grade: 'Grade 5', subject: 'Mathematics', unit: 'Algebra', topic: 'Patterns and Variables' },
  { grade: 'Grade 5', subject: 'Mathematics', unit: 'Number Sense', topic: 'Percentages and Ratios' },
  { grade: 'Grade 5', subject: 'Science', unit: 'Earth & Space', topic: 'Solar System & Planets' },
  { grade: 'Grade 5', subject: 'Science', unit: 'Life Science', topic: 'Human Body Systems' },
  { grade: 'Grade 5', subject: 'Science', unit: 'Life Science', topic: 'Food Webs and Ecosystems' },
  { grade: 'Grade 5', subject: 'Social Studies', unit: 'History', topic: 'Ancient Civilisations' },
  { grade: 'Grade 5', subject: 'English', unit: 'Writing', topic: 'Persuasive Writing' },
  { grade: 'Grade 5', subject: 'English', unit: 'Writing', topic: 'Formal vs Informal Writing' },
  { grade: 'Grade 5', subject: 'English', unit: 'Writing', topic: 'Research and Note-taking' },
  { grade: 'Grade 5', subject: 'English', unit: 'Literature', topic: 'Poetry and Figurative Language' },
  { grade: 'Grade 5', subject: 'English', unit: 'Literature', topic: 'Literary Devices' },
  { grade: 'Grade 5', subject: 'English', unit: 'Grammar', topic: 'Direct and Indirect Speech' },
  { grade: 'Grade 5', subject: 'English', unit: 'Grammar', topic: 'Active and Passive Voice' },
  { grade: 'Grade 5', subject: 'English', unit: 'Vocabulary', topic: 'Idioms and Expressions' },
  { grade: 'Grade 5', subject: 'Arts', unit: 'Performing Arts', topic: 'Drama and Expression' },
  { grade: 'Grade 5', subject: 'ICT', unit: 'Coding', topic: 'Introduction to Scratch' },
];

// Static IB PYP subject lists per grade — shown instantly; overridden if Qdrant has live data
export const IB_PYP_SUBJECTS_BY_GRADE: Record<string, SubjectData[]> = {
  'Grade 3': [
    { subject: 'Mathematics', topicCount: 16, topics: [] },
    { subject: 'Science', topicCount: 11, topics: [] },
    { subject: 'English', topicCount: 9, topics: [] },
    { subject: 'Social Studies', topicCount: 8, topics: [] },
    { subject: 'Arts', topicCount: 4, topics: [] },
    { subject: 'Physical Education', topicCount: 3, topics: [] },
    { subject: 'ICT', topicCount: 2, topics: [] },
  ],
  'Grade 4': [
    { subject: 'Mathematics', topicCount: 12, topics: [] },
    { subject: 'Science', topicCount: 8, topics: [] },
    { subject: 'English', topicCount: 10, topics: [] },
    { subject: 'Social Studies', topicCount: 5, topics: [] },
    { subject: 'Arts', topicCount: 2, topics: [] },
    { subject: 'Physical Education', topicCount: 2, topics: [] },
    { subject: 'ICT', topicCount: 2, topics: [] },
  ],
  'Grade 5': [
    { subject: 'Mathematics', topicCount: 11, topics: [] },
    { subject: 'Science', topicCount: 7, topics: [] },
    { subject: 'English', topicCount: 8, topics: [] },
    { subject: 'Social Studies', topicCount: 5, topics: [] },
    { subject: 'Arts', topicCount: 2, topics: [] },
    { subject: 'Physical Education', topicCount: 2, topics: [] },
    { subject: 'ICT', topicCount: 2, topics: [] },
  ],
};

// Grades with no curriculum content ingested yet — show a "coming soon" state
// instead of falling back to other grades' topics (mock data). (client feedback)
export const NO_CONTENT_GRADES = ['Nursery', 'LKG', 'UKG'];
