import LEARNING_PATHS_SERVER_URL from '../../../../config/learningPathsServerUrl';
import { type SyllabusChapter } from '../../../../data/cbseG6EnglishSyllabus';
import { getSubjectSyllabus } from '../../../../data/syllabusRegistry';
import type { DbUnit } from './types';

// Curated (chapter-accurate) syllabi, shared with LessonScreen via
// syllabusRegistry.ts. This is the pre-pipeline fallback for subjects that
// were hand-built/generated before the teacher upload pipeline existed —
// real teacher uploads (below) always take priority once they exist for a scope.
export function getCuratedSyllabus(curriculum: string, grade: string, subject: string): SyllabusChapter[] | null {
  const chapters = getSubjectSyllabus(curriculum, grade, subject);
  return chapters.length > 0 ? chapters : null;
}

export async function fetchPublishedSyllabus(curriculum: string, grade: string, subject: string): Promise<DbUnit[]> {
  // IB DP and IB MYP have no teacher-uploaded syllabus_chapters rows — their
  // content lives in Qdrant (see aivorah-learning-paths-service
  // routes/curriculum.js), so they read from a different endpoint. Every
  // other curriculum is unchanged.
  const isIBDP = /^ib.?dp$/i.test(curriculum.trim());
  const isIBMYP = /^ib.?myp$/i.test(curriculum.trim());
  const path = (isIBDP || isIBMYP)
    ? `/curriculum/syllabus?grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(subject)}&curriculum=${encodeURIComponent(curriculum)}`
    : `/teacher/syllabus/current?grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(subject)}&curriculum=${encodeURIComponent(curriculum)}`;
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}${path}`);
  if (!res.ok) return [];
  const data = await res.json();
  // Keep chapters that have no lessons yet. The server now returns the book's
  // FULL chapter list (empty ones flagged `pending`), and dropping those here
  // put Class 11 Maths straight from Ch 1 Sets to Ch 3 Trigonometric Functions —
  // Ch 2 Relations and Functions, Ch 5 and Ch 11 simply vanished, which reads as
  // a missing syllabus rather than "not written yet".
  const units = (data.units || []);
  // If the server sent nothing usable at all, treat the subject as unpublished
  // so the caller still falls back to the curated syllabus.
  return units.some((u: DbUnit) => u.topics?.length > 0) ? units : [];
}
