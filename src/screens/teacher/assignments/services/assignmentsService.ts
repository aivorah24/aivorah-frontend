import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';
import type { TaskStep } from '../types';
import { stripInternalQuizFields } from '../utils/quizHtml';

export interface ExtractedQuestion {
  question: string;
  answer: string;
  comment: string;
}

interface UploadedExtractedQuestion {
  question: string;
  expectedAnswer: string;
  comment: string;
}

// Maps extracted-worksheet questions into the shape the /assignments POST
// body expects. This used to also upload a per-question cropped reference
// image to Cloudinary first (`eq.croppedImage`, a `data:` URL) — that path
// was removed 2026-08-25: the only UI that could ever produce a
// `croppedImage` (the crop-selection modal) was already dead/unreachable,
// so `croppedImage` was always `''` and the upload branch never ran.
export function buildUploadedExtractedQuestions(
  extractedQuestions: ExtractedQuestion[]
): UploadedExtractedQuestion[] {
  return extractedQuestions.map(eq => ({
    question: eq.question,
    expectedAnswer: eq.answer || '',
    comment: eq.comment || '',
  }));
}

export interface BuildAssignmentPayloadArgs {
  title: string;
  subject: string;
  chapter: string;
  dueDate: string;
  type: 'assignment' | 'quiz';
  assignTo: 'all' | 'specific';
  selectedStudentId: string | null;
  teacherEmail: string;
  grade: string;
  curriculum: string;
  questions: string[];
  uploadedExtracted: UploadedExtractedQuestion[];
  extractedQuestions: ExtractedQuestion[];
  ibLearningOutcomes: string[];
  successCriteria: string[];
  taskSteps: TaskStep[];
  ibWordBank: string[];
  quizQuestions: any[];
  interactiveQuiz: any;
  docFiles: { url?: string }[];
  ibPurpose: string;
  note: string;
  unitOfInquiry: string;
  selectedLanguage: string;
  ibCentralIdea: string;
  ibLinesOfInquiry: string[];
  ibLearnerProfile: string;
  ibAtlSkill: string;
  ibKeyConcept: string;
}

// Pure mapping from form state -> the /assignments POST body — extracted
// verbatim (no behavior change) from TeacherAssignmentsScreen.tsx's
// createAssignment(), so the field-merging logic (successCriteria,
// taskSteps' wordBank, interactiveQuiz stripping, questions fallback) is
// unit-testable without mounting the screen.
export function buildAssignmentPayload(args: BuildAssignmentPayloadArgs) {
  const {
    title, subject, chapter, dueDate, type, assignTo, selectedStudentId, teacherEmail, grade, curriculum,
    questions, uploadedExtracted, extractedQuestions, ibLearningOutcomes, successCriteria, taskSteps, ibWordBank,
    quizQuestions, interactiveQuiz, docFiles, ibPurpose, note, unitOfInquiry, selectedLanguage,
    ibCentralIdea, ibLinesOfInquiry, ibLearnerProfile, ibAtlSkill, ibKeyConcept,
  } = args;

  return {
    title: title.trim(),
    subject,
    chapter: chapter.trim(),
    dueDate,
    type,
    studentId: assignTo === 'specific' ? (selectedStudentId ?? null) : null,
    createdById: teacherEmail,
    createdByRole: 'teacher',
    grade,
    curriculum,
    // Merge plain questions + extracted questions from worksheet as structured objects
    questions: (() => {
      const plain = questions.filter(q => q.trim());
      if (uploadedExtracted.length > 0) return uploadedExtracted;
      // Stepped assignments never show plain questions to students
      return taskSteps.length > 0 ? [] : plain;
    })(),
    // Include expected answers from extracted questions for AI validation
    questionAnswers: extractedQuestions.filter(q => q.answer.trim()).reduce((acc, q) => {
      acc[q.question] = q.answer;
      return acc;
    }, {} as Record<string, string>),
    teacherComments: extractedQuestions.filter(q => q.comment.trim()).map(q => ({ question: q.question, comment: q.comment })),
    // Merge IB learning outcomes into successCriteria if present, else use manual list
    successCriteria: ibLearningOutcomes.filter(l => l.trim()).length > 0
      ? ibLearningOutcomes.filter(l => l.trim())
      : successCriteria.filter(c => c.trim()),
    // Merge ibWordBank into the structured_writing step so students see the word bank
    taskSteps: taskSteps.map(s => ({
      ...s,
      wordBank: s.type === 'structured_writing' && ibWordBank.length > 0
        ? ibWordBank
        : (s.wordBank || []),
    })),
    quizQuestions: quizQuestions,
    // Interactive quiz (from PDF→Gemini pipeline) — stored for student rendering
    interactiveQuiz: interactiveQuiz ? stripInternalQuizFields(interactiveQuiz) : null,
    interactiveQuizHtml: (interactiveQuiz as any)?._previewHTML || null,
    documentUrl: docFiles[0]?.url || null,
    documentUrls: docFiles.map(f => f.url).filter(Boolean),
    // Store ibPurpose in note field so students see the assignment purpose
    note: ibPurpose.trim() || note.trim(),
    unitOfInquiry: unitOfInquiry.trim() || null,
    language: subject === 'Language Acquisition' ? selectedLanguage : null,
    centralIdea: ibCentralIdea || null,
    linesOfInquiry: ibLinesOfInquiry.filter(l => l.trim()),
    learnerProfile: ibLearnerProfile || null,
    atlSkill: ibAtlSkill || null,
    keyConcept: ibKeyConcept || null,
  };
}

export type PostCreateAssignmentResult =
  | { ok: true; data: any }
  | { ok: false; error: string };

// POST /assignments + response parsing — extracted verbatim (no behavior
// change) from TeacherAssignmentsScreen.tsx's createAssignment(), then
// repointed to aivorah-assignments-service (2026-09-11, B05) once that
// service's POST / was extended to accept the full field set. Network
// failures are surfaced as { ok: false, error: 'Network error...' }, same
// message the screen showed before.
export async function postCreateAssignment(payload: any): Promise<PostCreateAssignmentResult> {
  try {
    const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const responseText = await res.text();
    console.log('[createAssignment] Response:', res.status, responseText.substring(0, 500));
    if (res.ok) {
      return { ok: true, data: JSON.parse(responseText) };
    }
    let errMsg = 'Failed to create';
    try { errMsg = JSON.parse(responseText).error || errMsg; } catch {}
    return { ok: false, error: errMsg };
  } catch {
    return { ok: false, error: 'Network error. Check server connection.' };
  }
}
