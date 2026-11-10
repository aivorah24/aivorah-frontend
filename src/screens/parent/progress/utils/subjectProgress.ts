import { subjectMeta } from '../../learning/constants';

export interface LearningSubject {
  subject: string;
  topics: string[];
  topicCount?: number;
}

export interface SubjectProgressRow {
  label: string;
  icon: string;
  pct: number;
  completed: number;
  total: number;
}

// One row per subject in the child's learning path, counted against that subject's own syllabus topics.
export function buildSubjectProgress(subjects: LearningSubject[], completedTopics: string[]): SubjectProgressRow[] {
  const done = new Set(completedTopics);
  return subjects.map((s) => {
    const total = s.topics.length || s.topicCount || 0;
    const completed = s.topics.filter((t) => done.has(t)).length;
    return {
      label: s.subject,
      icon: subjectMeta(s.subject).icon,
      pct: total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0,
      completed,
      total,
    };
  });
}

export function learningPathTotals(rows: SubjectProgressRow[]) {
  return rows.reduce((acc, r) => ({ completed: acc.completed + r.completed, total: acc.total + r.total }), { completed: 0, total: 0 });
}
