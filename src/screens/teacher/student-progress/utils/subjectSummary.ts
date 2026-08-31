import type { HeatmapStudent, HeatmapTopic } from '../types';

export interface SubjectProgressCard {
  subject: string;
  // % of this subject's real syllabus topics (every topic in Qdrant for this
  // curriculum+grade, not just attempted ones) currently at 'mastered',
  // across the filtered class. `null` when there's no syllabus/topic data
  // to measure against at all (never a fake 0%).
  avgMasteryPct: number | null;
  studentCount: number; // real students scoped to this subject in the filtered class
}

// Derived directly from the SAME filtered heatmap data driving Topic
// Exploration — not a separate backend call — so this section can never
// disagree with the population the teacher has filtered to (Curriculum/
// Grade/Section/Subject). `students`/`topics` here should be filtered by
// curriculum+grade+section (NOT subject), so every subject the teacher
// teaches for that class still gets its own card even when one subject is
// selected in the top filter.
//
// Since the heatmap now unions real syllabus topics into every student's
// topicStatus (see aivorah-teacher-dashboard-service/routes/student.js's
// heatmap route), every syllabus topic has a status entry — including
// untouched ones as 'not_started'. That makes this genuinely "% of the real
// syllabus mastered", not "% of what's been attempted" (which used to read
// as a flattering 50% off just 2 attempted topics out of a 38-topic syllabus).
// `extraSubjects` — the teacher's own configured Staff Subject Mapping
// (same source as the Subject filter dropdown, see utils/profileSubjects.ts)
// — ensures a subject the teacher teaches but has no real topic data for yet
// (e.g. English, with only Mathematics students linked so far) still gets
// its own card, showing the real "No syllabus data yet" empty state rather
// than being silently absent.
export function computeSubjectSummary(students: HeatmapStudent[], topics: HeatmapTopic[], extraSubjects: string[] = []): SubjectProgressCard[] {
  const subjects = Array.from(new Set([
    ...topics.map((t) => t.subject).filter((s): s is string => !!s),
    ...extraSubjects,
  ]));

  return subjects.map((subject) => {
    const topicNames = new Set(topics.filter((t) => t.subject === subject).map((t) => t.topic));
    let masteredCells = 0;
    let totalCells = 0;
    const countedStudents = new Set<string>();

    students.forEach((s) => {
      if (!s.scopedSubjects.includes(subject)) return;
      topicNames.forEach((topic) => {
        const status = s.topicStatus[topic];
        if (!status) return;
        totalCells++;
        countedStudents.add(s.id);
        if (status.status === 'mastered') masteredCells++;
      });
    });

    return {
      subject,
      avgMasteryPct: totalCells > 0 ? Math.round((masteredCells / totalCells) * 100) : null,
      studentCount: countedStudents.size,
    };
  });
}
