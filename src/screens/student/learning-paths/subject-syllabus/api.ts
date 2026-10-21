import LEARNING_PATHS_SERVER_URL from '../../../../config/learningPathsServerUrl';
import { type SyllabusChapter } from '../../../../data/cbseG6EnglishSyllabus';
import { getSubjectSyllabus } from '../../../../data/syllabusRegistry';
import { isSyllabusOnlyCurriculum } from '../../../../utils/curriculum';
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
  // IB DP, IB MYP, and Cambridge Grade 6+ have no teacher-uploaded
  // syllabus_chapters rows — their content lives in Qdrant (see
  // aivorah-learning-paths-service routes/curriculum.js), so they read from
  // a different endpoint. Every other curriculum is unchanged.
  const isIBDP = /^ib.?dp$/i.test(curriculum.trim());
  const isIBMYP = /^ib.?myp$/i.test(curriculum.trim());
  // ICSE and Cambridge (every grade) have no textbook yet: the service
  // returns their syllabus outline with each topic marked comingSoon.
  const path = (isIBDP || isIBMYP || isSyllabusOnlyCurriculum(curriculum))
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
  // The server already returns an empty array when it has no real book/chapter
  // match for this subject+grade at all — that's the only case that should fall
  // back to the curated syllabus. Previously this also discarded the WHOLE list
  // whenever every chapter happened to be pending (no lessons generated yet for
  // any of them), which hid subjects like Grade 11 Sociology entirely behind a
  // generic "being processed" screen instead of showing their real chapter
  // titles as pending — the exact anti-pattern the per-chapter `pending` flag
  // above was already introduced to avoid.
  return data.units || [];
}
