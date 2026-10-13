import SERVER_URL from '../../../../config/serverUrl';
import LEARNING_PATHS_SERVER_URL from '../../../../config/learningPathsServerUrl';
import STUDENTS_SERVER_URL from '../../../../config/studentsServerUrl';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';
import PARENT_SERVER_URL from '../../../../config/parentServerUrl';
import { isCbseCurriculum } from '../../../../utils/curriculum';

// Fallback only - used before the child's curriculum/grade is known, or if
// the /curriculum/subjects lookup below fails. The real subject list is
// fetched per-child (curriculum + grade), same source as the student
// learning-paths screen (see useSubjects.ts) - a curriculum can't be assumed
// to be IB PYP, e.g. an NCERT/CBSE Grade 11 child has Accountancy, Business
// Studies, etc. instead.
export const IB_PYP_SUBJECTS = ['Mathematics', 'Science', 'English', 'Social Studies', 'Arts', 'Physical Education', 'ICT'];

// aivorah-students-service now owns GET /parent/:email/children (ported off
// the monolith, totalTopics sourced from aivorah-learning-paths-service's
// Qdrant-backed /curriculum/topic-count instead of embedded here) - every
// other /parent/* route (credentials, init-auth, link-created, ...) is still
// monolith-only, so only this one call moved.
export async function fetchChildren(parentEmail: string): Promise<any[]> {
  const res = await fetch(`${PARENT_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children`);
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data : [];
}

export async function fetchAssignmentsAndStats(childId: string): Promise<{ assignments: any[]; stats: any }> {
  const [assignData, statsData] = await Promise.all([
    fetch(`${ASSIGNMENTS_SERVER_URL}/assignments?studentId=${childId}&viewerRole=parent`).then(r => r.json()).catch(() => []),
    fetch(`${STUDENTS_SERVER_URL}/student/${childId}`).then(r => r.json()).catch(() => null),
  ]);
  return {
    assignments: Array.isArray(assignData) ? assignData : [],
    stats: statsData && !statsData.error ? statsData : null,
  };
}

export async function fetchCurriculumTopics(grade: string): Promise<{ subject: string; topic: string; grade: string }[]> {
  const res = await fetch(`${SERVER_URL}/curriculum`);
  const data = await res.json();
  return (data.topics || []).filter((t: any) => t.grade === grade);
}

// Subject options for the modal must match the selected child's actual
// curriculum (IB PYP/MYP/DP, CBSE, IGCSE, ...) - not be hardcoded to IB PYP,
// or e.g. a CBSE Grade 11 child would only see IB subjects and never
// Accountancy/Business Studies/etc. Same /curriculum/subjects source the
// student learning-paths screen uses (see useSubjects.ts for why IB DP/MYP
// and CBSE route to the learning-paths service instead of the monolith).
export async function fetchSubjectOptions(curriculum: string, grade: string): Promise<string[]> {
  const isCBSE = isCbseCurriculum(curriculum);
  const isIBDPorMYP = /^ib.?(dp|myp)$/i.test(curriculum.trim());
  const gradeNum = parseInt(String(grade).replace(/\D/g, ''), 10);
  const isCambridgeQdrant = /^cambridge$/i.test(curriculum.trim()) && gradeNum >= 6;
  const base = (isIBDPorMYP || isCambridgeQdrant || isCBSE) ? LEARNING_PATHS_SERVER_URL : SERVER_URL;
  const queryCurriculum = isCBSE ? 'CBSE' : curriculum;
  const res = await fetch(`${base}/curriculum/subjects?grade=${encodeURIComponent(grade)}&curriculum=${encodeURIComponent(queryCurriculum)}`);
  const data: { subjects?: ({ name?: string } | string)[] } = await res.json();
  const names = (data.subjects || [])
    .map((s) => (typeof s === 'string' ? s : s?.name))
    .filter(Boolean) as string[];
  return names.length > 0 ? names : IB_PYP_SUBJECTS;
}

export interface GenerateAIPayload {
  prompt: string;
  subject: string;
  grade?: string | null;
  curriculum?: string | null;
  count: number;
  type: 'assignment' | 'quiz';
}

export async function generateWithAI(payload: GenerateAIPayload): Promise<any> {
  const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/ai-generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: payload.prompt,
      subject: payload.subject,
      grade: payload.grade,
      curriculum: payload.curriculum || 'IB PYP',
      count: payload.count,
      type: payload.type,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'AI generation failed');
  }
  return res.json();
}

export interface CreateAssignmentPayload {
  title: string;
  subject: string;
  chapter: string;
  dueDate: string;
  type: 'assignment' | 'quiz';
  note: string;
  studentId: string;
  studentName: string;
  parentEmail: string;
  grade?: string | null;
  curriculum?: string | null;
  questions: string[];
  quizQuestions: any[];
}

export async function createAssignment(payload: CreateAssignmentPayload): Promise<any> {
  const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: payload.title,
      subject: payload.subject,
      chapter: payload.chapter,
      dueDate: payload.dueDate,
      type: payload.type,
      note: payload.note,
      studentId: payload.studentId,
      studentName: payload.studentName,
      createdById: payload.parentEmail,
      createdByRole: 'parent',
      grade: payload.grade,
      curriculum: payload.curriculum,
      questions: payload.questions,
      // For a quiz, send the MCQ questions (with options + correct) so the child
      // gets real multiple-choice, not plain text. Empty for assignments.
      quizQuestions: payload.type === 'quiz' ? payload.quizQuestions : [],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create assignment');
  }
  return res.json();
}
