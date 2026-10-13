import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useStudentData } from '../../../../context/StudentDataContext';
import { useNotification } from '../../../../context/NotificationContext';
import SERVER_URL from '../../../../config/serverUrl';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';
import type { Assignment, QuizQuestion } from '../types';
import { normalizeCurriculum } from '../../../../utils/curriculum';

// True only for a brief grace period right after a page load. A refresh that
// restores the Assignments route focuses it immediately — during this window we
// skip marking-as-seen, so the unread badge survives the refresh. A genuine
// in-session navigation happens later and clears normally.
let sPageJustLoaded = true;
setTimeout(() => { sPageJustLoaded = false; }, 3000);

function normalizeQuizQuestions(rawQuestions: any[]): QuizQuestion[] {
  return (rawQuestions || []).reduce<QuizQuestion[]>((acc, q: any, i: number) => {
    if (!q) return acc;

    // MCQ-only policy: ignore plain string questions (treated as short-answer legacy data)
    if (typeof q === 'string') return acc;

    const questionText = String(q.question || '').trim();
    if (!questionText) return acc;

    const options = Array.isArray(q.options)
      ? q.options.map((opt: any) => String(opt).trim()).filter(Boolean)
      : undefined;
    const optionTexts = options?.map((opt: string) => opt.replace(/^[A-D]\.\s*/i, '').trim());
    // fill_blank type
    if (q.type === 'fill_blank') {
      acc.push({
        id: String(q.id || `q${i + 1}`),
        question: questionText,
        type: 'fill_blank',
        options: [],
        correct: typeof q.correct === 'string' ? q.correct.trim() : '',
        hint: q.hint ? String(q.hint) : '',
        explanation: q.explanation ? String(q.explanation) : '',
      });
      return acc;
    }

    const normalizedType: 'mcq' | 'short_answer' =
      (q.type === 'short_answer' || !optionTexts || optionTexts.length === 0) ? 'short_answer' : 'mcq';
    if (normalizedType !== 'mcq') return acc;
    if (!optionTexts || optionTexts.length !== 4) return acc;

    let correct = '';
    if (normalizedType === 'mcq' && optionTexts && optionTexts.length > 0) {
      if (typeof q.correct === 'number' && optionTexts[q.correct]) {
        correct = optionTexts[q.correct];
      } else if (typeof q.correct === 'string') {
        const letter = q.correct.trim().match(/^([A-D])(?:\.|\b)/i)?.[1]?.toUpperCase();
        if (letter) {
          const idx = 'ABCD'.indexOf(letter);
          correct = idx >= 0 && optionTexts[idx] ? optionTexts[idx] : q.correct.replace(/^[A-D]\.\s*/i, '').trim();
        } else {
          correct = q.correct.replace(/^[A-D]\.\s*/i, '').trim();
        }
      }
    } else if (typeof q.correct === 'string') {
      correct = q.correct.trim();
    }

    acc.push({
      id: String(q.id || `q${i + 1}`),
      question: questionText,
      type: 'mcq',
      options: optionTexts,
      correct,
      hint: q.hint ? String(q.hint) : '',
      explanation: q.explanation ? String(q.explanation) : '',
    });
    return acc;
  }, []);
}

async function hydrateQuizQuestions(item: Assignment): Promise<QuizQuestion[]> {
  const fromLocal = normalizeQuizQuestions((item as any).quizQuestions || []);
  if (fromLocal.length > 0) return fromLocal;

  const fromLegacy = normalizeQuizQuestions((item as any).questions || []);
  if (fromLegacy.length > 0) return fromLegacy;

  const topic = (item.chapter || item.subject || '').trim();
  if (!topic) return [];

  try {
    const primaryRes = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/generate-quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: item.subject || 'Mathematics',
        chapter: topic,
        grade: item.grade || 'Grade 3',
        curriculum: normalizeCurriculum(item.curriculum) || 'CBSE',
        difficulty: 'medium',
        count: 5,
        teacherNotes: '',
      }),
    });
    const primaryData = await primaryRes.json().catch(() => null);
    if (primaryRes.ok && Array.isArray(primaryData?.questions)) {
      const normalized = normalizeQuizQuestions(primaryData.questions);
      if (normalized.length > 0) return normalized;
    }
  } catch {
    // fallback below
  }

  try {
    const fallbackPath = item.subject?.toLowerCase().includes('science') ? '/ncert/science-quiz' : '/ncert/quiz';
    const fallbackRes = await fetch(`${SERVER_URL}${fallbackPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, context: '' }),
    });
    const fallbackData = await fallbackRes.json().catch(() => null);
    if (fallbackRes.ok && Array.isArray(fallbackData?.questions)) {
      return normalizeQuizQuestions(fallbackData.questions);
    }
  } catch {
    // no-op
  }

  return [];
}

export function useAssignments(highlightId: string | undefined, navigation: any) {
  const [activeFilter, setActiveFilter] = useState('All');
  const { studentId, recordStudySeconds } = useStudentData();
  const { clearUnreadAssignments } = useNotification();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  // Distinct from "no assignments" - set when the last load() attempt
  // failed, so the screen can tell the student "couldn't load" instead of
  // the misleading "you have nothing assigned" empty state.
  const [loadError, setLoadError] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  // Latest progress reported by the interactive-quiz iframe — used to gate the
  // "Submit Assignment" button so the student confirms submission explicitly
  // instead of it firing silently the instant every question is answered.
  const [quizProgress, setQuizProgress] = useState<{ pct: number; completed: boolean; correct: number; total: number; attemptedCount: number; answers: any[] } | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  // Native (WebView) resets progress on each new interactive-quiz assignment the
  // same way the web path's iframe ref callback does on first mount.
  useEffect(() => {
    if (Platform.OS !== 'web' && activeAssignment?.interactiveQuizHtml) {
      // external sync (WebView progress reset on new assignment id) — not derivable state
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuizProgress(null);
      setSubmittingQuiz(false);
    }
  }, [activeAssignment?.id]);

  // Real "Study Time" for time spent actually working an assignment (any type:
  // quiz modal, scaffolded, submission, or the interactive-quiz iframe) — timed
  // for the whole session an assignment is open, flushed when it closes.
  const assignmentSessionStartRef = useRef<number>(0);
  useEffect(() => {
    if (!activeAssignment) return;
    assignmentSessionStartRef.current = Date.now();
    return () => {
      recordStudySeconds(Math.floor((Date.now() - assignmentSessionStartRef.current) / 1000), 'assignment');
      assignmentSessionStartRef.current = 0;
    };
  }, [activeAssignment]);
  const [openingAssignmentId, setOpeningAssignmentId] = useState<string | null>(null);
  const [viewingResult, setViewingResult] = useState<Assignment | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{ assignment: Assignment; data: any } | null>(null);
  const [expandedExplain, setExpandedExplain] = useState<Record<number, { loading: boolean; steps?: string[]; correctAnswer?: string; tip?: string }>>({});

  // Auto-fetch explanations for all wrong answers when a completed result is opened
  useEffect(() => {
    if (!viewingResult) return;
    let pq: any[] = [];
    try { pq = JSON.parse(viewingResult.aiFeedback || '{}').perQuestion || []; } catch {}
    pq.forEach((q: any, i: number) => {
      if (q.correct || !q.answered) return;
      setExpandedExplain(prev => {
        if (prev[i]?.steps || prev[i]?.loading) return prev;
        return { ...prev, [i]: { loading: true } };
      });
      fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/${viewingResult.id}/explain-question`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.question, studentAnswer: q.studentAnswer, correctAnswer: q.correctAnswer, score: q.score, subject: viewingResult.subject, grade: viewingResult.grade }),
      })
        .then(r => r.json())
        .then(data => setExpandedExplain(prev => ({ ...prev, [i]: { loading: false, steps: data.steps || [], correctAnswer: data.correctAnswer || q.correctAnswer || '', tip: data.tip || '' } })))
        .catch(() => setExpandedExplain(prev => ({ ...prev, [i]: { loading: false, steps: [], correctAnswer: q.correctAnswer || '', tip: '' } })));
    });
  }, [viewingResult]);

  function load() {
    if (!studentId) return;
    fetch(`${ASSIGNMENTS_SERVER_URL}/assignments?studentId=${studentId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAssignments(data);
          setLoadError(false);
        } else {
          // Non-array response (e.g. an { error } body from a failed
          // request) - surface it rather than silently pretending the
          // student has zero assignments.
          setLoadError(true);
        }
        setLoading(false);
      })
      .catch(() => { setLoadError(true); setLoading(false); });
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30 * 1000);
    return () => clearInterval(interval);
  }, [studentId]);

  // Mark assignments as "seen" only when the screen is actually focused (viewed) —
  // NOT on mount, and NOT during the post-refresh grace period. Otherwise the unread
  // badge gets wiped on every page refresh (the permanent drawer re-focuses this
  // screen immediately on load).
  useFocusEffect(useCallback(() => {
    load();
    if (!sPageJustLoaded) clearUnreadAssignments();
  }, [studentId]));

  function sortByPendingFirst(list: Assignment[]) {
    return [...list].sort((a, b) => {
      // Completed always at bottom
      const ac = a.status === 'completed' ? 1 : 0;
      const bc = b.status === 'completed' ? 1 : 0;
      if (ac !== bc) return ac - bc;
      // Within pending: newest created first
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return cb - ca;
    });
  }

  const filtered = useMemo(() => {
    if (activeFilter === 'All')       return sortByPendingFirst(assignments);
    if (activeFilter === 'Pending')   return sortByPendingFirst(assignments.filter(a => a.status === 'pending'));
    if (activeFilter === 'Completed') return assignments.filter(a => a.status === 'completed').sort((a,b) => new Date(b.createdAt || b.dueDate).getTime() - new Date(a.createdAt || a.dueDate).getTime());
    if (activeFilter === 'Quizzes')   return sortByPendingFirst(assignments.filter(a => a.type === 'quiz'));
    return sortByPendingFirst(assignments);
  }, [assignments, activeFilter]);

  const pending   = assignments.filter(a => a.status === 'pending').length;
  const completed = assignments.filter(a => a.status === 'completed').length;
  const overdue   = assignments.filter(a => {
    if (a.status !== 'pending') return false;
    if (a.joinedAfterDue) return false; // joined after due date — not overdue
    const today = new Date(); today.setHours(0,0,0,0);
    return new Date(a.dueDate) < today;
  }).length;

  function handleSubmitted(updated: Assignment & { aiFeedback: string; perQuestion: any[] }) {
    setAssignments(prev => prev.map(a => a.id === updated.id ? updated : a));
  }

  async function openAssignment(item: Assignment) {
    if ((item as any).closed && item.status !== 'completed') {
      Alert.alert('Assignment Closed', 'This assignment closed on its due date and no longer accepts submissions.');
      return;
    }
    setOpeningAssignmentId(item.id);
    try {
      if (item.type === 'quiz') {
        const local = normalizeQuizQuestions((item.quizQuestions as any[]) || (item.questions as any[]) || []);
        if (local.length > 0) {
          setActiveAssignment({ ...item, quizQuestions: local });
          return;
        }
        const hydrated = await hydrateQuizQuestions(item);
        if (hydrated.length === 0) {
          Alert.alert('Quiz not ready', 'This quiz has no questions yet. Please ask your teacher to regenerate it.');
          return;
        }
        setActiveAssignment({ ...item, quizQuestions: hydrated });
        return;
      }
      setActiveAssignment(item);
    } finally {
      setOpeningAssignmentId(null);
    }
  }

  // Deep-link open: when arriving from a notification or the Schedule (both pass
  // highlightId), open the matching assignment the instant it's available — whether
  // the list is already loaded (opens immediately, no flash) or still loading
  // (opens as soon as it arrives). Clearing the param prevents reopening on refocus.
  useEffect(() => {
    if (!highlightId) return;
    const target = assignments.find(a =>
      a.id === highlightId || (a as any).scheduleId === highlightId
    );
    if (target) {
      // external sync (deep-link open + navigation param clear) — not derivable state
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openAssignment(target);
      navigation.setParams?.({ highlightId: undefined });
    }
  }, [highlightId, assignments]);

  return {
    activeFilter, setActiveFilter,
    assignments, loading, loadError, setLoading, load,
    activeAssignment, setActiveAssignment,
    quizProgress, setQuizProgress,
    submittingQuiz, setSubmittingQuiz,
    openingAssignmentId,
    viewingResult, setViewingResult,
    submittedResult, setSubmittedResult,
    expandedExplain, setExpandedExplain,
    filtered, pending, completed, overdue,
    handleSubmitted, openAssignment,
    studentId,
  };
}
