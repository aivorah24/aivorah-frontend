import type { Student } from './types';

// A student counts as "inactive" only if they have ALREADY engaged at least
// once (a real last-active date) and haven't returned in 3+ days. A freshly
// added student who has never logged in is NOT inactive — otherwise every new
// student shows up under Inactive the moment the teacher adds them. Never-active
// students that linger are surfaced via "Needs Attention" instead (after its own
// grace window), so the two buckets don't both fire on brand-new accounts.
export const INACTIVE_DAYS = 3;

export const TABS = ['All', 'Grade 3', 'Grade 4', 'Grade 5', 'Needs Attention'];

// ── Demo student registry (only for known demo/test accounts) ─────────────
export const DEMO_EMAILS = new Set([
  'anjali@test.ai', 'priya@test.ai', 'vikram@test.ai', 'teacher@demo.com',
]);

export const DEMO_STUDENTS: Student[] = [
  {
    id: 'aanya',    name: 'Aanya Kapoor',  email: 'aanya@test.ai',
    grade: 'Grade 3', subject: 'IB PYP',  curriculum: 'IB PYP',
    xpPoints: 850,   level: 4,   currentStreak: 5, studyTime: 12,
    completedTopics: ['Number Sense', 'Addition', 'Shapes'],
    progressPct: 68, assignmentsDone: 8, lastActive: new Date(Date.now() - 86400000).toISOString(),
    needsAttention: false,
  },
  {
    id: 'ishaan',   name: 'Ishaan Mehta',  email: 'ishaan@test.ai',
    grade: 'Grade 4', subject: 'IB PYP',  curriculum: 'IB PYP',
    xpPoints: 1050,  level: 5,   currentStreak: 3, studyTime: 18,
    completedTopics: ['Fractions', 'Multiplication', 'Time'],
    progressPct: 72, assignmentsDone: 11, lastActive: new Date(Date.now() - 172800000).toISOString(),
    needsAttention: false,
  },
  {
    id: 'rohan',    name: 'Rohan Patel',   email: 'rohan@test.ai',
    grade: 'Grade 5', subject: 'IB PYP',  curriculum: 'IB PYP',
    xpPoints: 1200,  level: 6,   currentStreak: 2, studyTime: 15,
    completedTopics: ['Decimals', 'Area & Perimeter'],
    progressPct: 45, assignmentsDone: 6, lastActive: new Date(Date.now() - 259200000).toISOString(),
    needsAttention: true,
  },
  {
    id: 'diya',     name: 'Diya Sharma',   email: 'diya@test.ai',
    grade: 'Grade 3', subject: 'IB PYP',  curriculum: 'IB PYP',
    xpPoints: 780,   level: 4,   currentStreak: 7, studyTime: 10,
    completedTopics: ['Patterns', 'Counting', 'Measurement'],
    progressPct: 82, assignmentsDone: 9, lastActive: new Date().toISOString(),
    needsAttention: false,
  },
];

// Enchanting Forest palette — matches app theme
export const AVATAR_GRADIENTS: [string, string][] = [
  ['#5F8A86', '#7AADA8'],   // slate teal → mint
  ['#5A8A70', '#7AADA8'],   // forest green → mint
  ['#B8797E', '#C4836A'],   // rose → peach
  ['#8A8358', '#C5BD96'],   // gold → khaki
  ['#5F8A86', '#5A8A70'],   // teal → green
  ['#C4836A', '#B8797E'],   // peach → rose
];

export const IB_PROGRAMS = ['IB PYP', 'IB MYP', 'IB DP'];
