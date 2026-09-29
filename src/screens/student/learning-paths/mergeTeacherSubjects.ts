import type { SubjectData } from './types';
import type { TeacherLearningPathSummary } from './teacher-learning-paths/types';

const norm = (v?: string | null) => String(v || '').toLowerCase().replace(/^grade\s*/, '').trim();

// Teacher paths for the student's grade are folded into the subject cards: a matching subject is tagged, a subject
// with no card yet (e.g. an IB upload) gets a new card. Returns the lower-cased names of subjects with teacher paths.
export function mergeTeacherSubjects(subjects: SubjectData[], paths: TeacherLearningPathSummary[], grade: string) {
  const forGrade = paths.filter((p) => p.subject && (!p.grade || norm(p.grade) === norm(grade)));
  const teacherSubjects = new Set(forGrade.map((p) => norm(p.subject)));
  const existing = new Set(subjects.map((s) => norm(s.subject)));
  const added: SubjectData[] = [...new Set(forGrade.map((p) => p.subject as string))]
    .filter((name) => !existing.has(norm(name)))
    .map((name) => ({ subject: name, topicCount: 0, topics: [], chapterCount: 0, unitCount: 0, units: [], books: [] }));
  return { subjects: [...subjects, ...added], teacherSubjects };
}
