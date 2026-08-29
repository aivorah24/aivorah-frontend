export type TopicMasteryStatus = 'mastered' | 'trying' | 'dropped' | 'stuck' | 'not_started';

export interface TopicStatus {
  status: TopicMasteryStatus;
  attempts: number;
  latestScore: number | null;
  bestScore: number | null;
  struggled: boolean;
  lastAttemptDate: string | null;
  subject: string | null;
}

export interface HeatmapStudent {
  id: string;
  name: string;
  grade: string | null;
  curriculum: string | null;
  section: string | null;
  class: string | null;
  photoUrl: string | null;
  scopedSubjects: string[];
  topicStatus: Record<string, TopicStatus>;
}

export interface HeatmapTopic {
  topic: string;
  subject: string | null;
}

export interface HeatmapData {
  students: HeatmapStudent[];
  topics: HeatmapTopic[];
}

// Section B — subject summary cards
export interface SubjectSummaryRow {
  subject: string;
  avgScorePct: number | null;
  avgAttemptSeconds: number | null;
  attemptCount: number;
}
export interface SubjectSummary {
  subjects: SubjectSummaryRow[];
  combined: Omit<SubjectSummaryRow, 'subject'> | null;
}

// Section D — Activity & Performance table. Only fields that come from a
// real column somewhere — no Learn/Listen/AI-Tutor time split and no "used
// Aivorah AI" flag, since neither is tracked anywhere in the schema.
export interface RosterStudent {
  id: string;
  name: string;
  grade: string;
  curriculum: string | null;
  section: string | null;
  class: string | null;
  photoUrl: string | null;
  scopedSubjects: string[];
  studyTime: number;
  learningPathTime: number;
  assignmentTime: number;
  challengeTime: number;
  // "Today" scope for the Activity & Performance Today/Overall toggle. Only
  // the Learning Path has a real per-day column (`learning_path_minutes`
  // reset daily) — Assignments/Challenges have no equivalent per-day
  // tracking anywhere in the schema, so there is no honest "today" value
  // for them (the UI must show an explicit "not tracked" state, never 0m).
  learningPathTimeToday: number | null;
  progressPct: number;
  // Real denominator behind progressPct (total topics for this student's
  // grade/curriculum/subject, from Qdrant). When 0, progressPct isn't a
  // real "0% of something" — there's no topic count to measure against at
  // all, and the UI must say so rather than render a fake-looking empty bar.
  totalTopics: number;
  completedTopics: string[]; // real numerator for the "X / Y topics" label
  quizAttempts: number;
  quizBestScore: number | null;
  lastActive: string | null;
  needsAttention: boolean;
}

// Section E — drill-down drawer
export interface TopicAttempt {
  attemptNumber: number;
  score: number | null;
  passed: boolean;
  totalQuestions: number | null;
  correctAnswers: number | null;
  mistakes: number | null;
  timeSpentSeconds: number | null;
  date: string | null;
}
