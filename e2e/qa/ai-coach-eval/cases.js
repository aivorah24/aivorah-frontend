// Representative grade/question pairs for the AI Coach quality eval.
//
// Each case is tied to a real dedicated student account (not a spoofed
// grade/curriculum param) - the AI Coach's grade/curriculum come from the
// LOGGED-IN account's own profile, not something the UI lets you type, so
// "representative grades" here means representative ACCOUNTS.
//
// student-a was deliberately left out even though it's NCERT/Grade 3: it's
// the shared read-only baseline several E2E specs assert dashboard values
// (XP, streak, topics explored) against, and every AI Coach reply calls
// exploreTopic() -> +25 XP, topicsExplored++, lastActiveDate updated. Using
// it here would quietly corrupt those other specs' expected values.
//
// student-e/student-f are owned by the parent screen-time specs (a lock
// flag) - unrelated to XP/topics, so reusing them for the occasional eval
// run doesn't collide with what those tests actually check.

export const CASES = [
  {
    id: 'grade4-ncert-plants',
    account: 'student-e',
    grade: 'Grade 4',
    curriculum: 'NCERT',
    question: 'What do plants need to grow?',
  },
  {
    id: 'grade4-ncert-safety',
    account: 'student-f',
    grade: 'Grade 4',
    curriculum: 'NCERT',
    question: 'Why should I not talk to strangers?',
  },
  {
    id: 'grade6-ncert-fractions',
    account: 'student-i',
    grade: 'Grade 6',
    curriculum: 'NCERT',
    question: 'How do I add two fractions with different denominators?',
  },
  {
    id: 'grade6-ncert-quadratic',
    account: 'student-i',
    grade: 'Grade 6',
    curriculum: 'NCERT',
    question: 'Solve x^2 - 5x + 6 = 0 and explain each step.',
  },
];
