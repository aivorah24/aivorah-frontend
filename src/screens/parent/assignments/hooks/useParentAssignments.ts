import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../../context/AuthContext';
import { useNotification } from '../../../../context/NotificationContext';
import * as parentAssignmentsService from '../services/parentAssignmentsService';
import { IB_PYP_SUBJECTS } from '../services/parentAssignmentsService';

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  chapter?: string;
  grade?: string | null;
  curriculum?: string | null;
  dueDate: string;
  type: string;
  status: 'pending' | 'completed';
  score: number | null;
  note: string;
  createdBy: string;
  aiFeedback?: string | null;
  questions?: string[];
  taskSteps?: any[];
  quizQuestions?: any[];
  documentUrl?: string | null;
  documentUrls?: string[];
  successCriteria?: string[];
}

export const FILTERS = ['All', 'School', 'Parent', 'Done'];
export const TYPES = ['assignment', 'quiz'] as const;

// Grace period after a page load — a refresh that restores this route shouldn't
// instantly clear the unread badge; only a real in-session navigation should.
let pPageJustLoaded = true;
setTimeout(() => { pPageJustLoaded = false; }, 3000);

export function useParentAssignments() {
  const { user } = useAuth();
  const { clearUnreadAssignments } = useNotification();
  const parentEmail = user?.email || 'parent@demo.com';

  const [children, setChildren] = useState<any[]>([]);
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeFilter, setActiveFilter] = useState('All');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [childStats, setChildStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [reportAssignment, setReportAssignment] = useState<Assignment | null>(null);
  const [detailAssignment, setDetailAssignment] = useState<Assignment | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Mathematics');
  const [chapter, setChapter] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState<'assignment' | 'quiz'>('assignment');
  const [note, setNote] = useState('');
  const [questions, setQuestions] = useState<string[]>(['']);
  // For quizzes: MCQ questions with options + correct answer (from AI generate).
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  // AI generate state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [quizCount, setQuizCount] = useState(5);
  // Curriculum topics
  const [curriculumTopics, setCurriculumTopics] = useState<{ subject: string; topic: string; grade: string }[]>([]);
  const [showTopicPicker, setShowTopicPicker] = useState(false);

  // Refresh the children list on every focus so a newly added child appears in the
  // assign picker instantly (no manual refresh needed).
  useFocusEffect(useCallback(() => {
    parentAssignmentsService.fetchChildren(parentEmail)
      .then(data => { if (data.length > 0) setChildren(data); })
      .catch(() => {})
      .finally(() => setChildrenLoaded(true));
  }, [parentEmail]));

  // Without a linked child, fetchAssignments below never runs (it bails out
  // early when `child` is undefined) — so loading must be resolved here
  // instead, or a parent with zero linked children spins on "Loading..."
  // forever instead of showing an empty/no-child state.
  useEffect(() => {
    if (childrenLoaded && children.length === 0) setLoading(false);
  }, [childrenLoaded, children.length]);

  // Mark assignments as seen only when this screen is actually focused (viewed),
  // not on mount, and not during the post-refresh grace period — otherwise a page
  // refresh clears the unread badge.
  useFocusEffect(useCallback(() => {
    if (!pPageJustLoaded) clearUnreadAssignments();
  }, [parentEmail]));

  const child = children[selectedIdx];

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAssignments = useCallback(() => {
    if (!child) return;
    parentAssignmentsService.fetchAssignmentsAndStats(child.id)
      .then(({ assignments: a, stats }) => {
        setAssignments(a);
        if (stats) setChildStats(stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [child?.id]);

  useEffect(() => {
    if (!child) return;
    setLoading(true);
    fetchAssignments();
  }, [fetchAssignments]);

  // Reload on focus + poll every 30s while screen is visible
  useFocusEffect(useCallback(() => {
    fetchAssignments();
    intervalRef.current = setInterval(fetchAssignments, 30000);
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [fetchAssignments]));

  // Load IB PYP curriculum topics for the child's grade
  useEffect(() => {
    if (!child?.grade) return;
    parentAssignmentsService.fetchCurriculumTopics(child.grade)
      .then(setCurriculumTopics)
      .catch(() => {});
  }, [child?.grade]);

  // Subject options for the modal must match the selected child's actual
  // curriculum (IB PYP/MYP/DP, CBSE, IGCSE, ...) - not be hardcoded to IB
  // PYP, or e.g. a CBSE Grade 11 child would only see IB subjects and never
  // Accountancy/Business Studies/etc.
  const [subjectOptions, setSubjectOptions] = useState<string[]>(IB_PYP_SUBJECTS);
  useEffect(() => {
    if (!child?.curriculum || !child?.grade) { setSubjectOptions(IB_PYP_SUBJECTS); return; }
    let cancelled = false;
    parentAssignmentsService.fetchSubjectOptions(child.curriculum, child.grade)
      .then((names) => { if (!cancelled) setSubjectOptions(names); })
      .catch(() => { if (!cancelled) setSubjectOptions(IB_PYP_SUBJECTS); });
    return () => { cancelled = true; };
  }, [child?.curriculum, child?.grade]);

  // If the previously-selected subject isn't valid for the newly-loaded
  // curriculum's subject list, fall back to the first available option
  // instead of silently submitting a subject the child's curriculum doesn't
  // have (e.g. "Mathematics" carried over is fine, but "Arts" isn't valid
  // for a CBSE Grade 11 subject list).
  useEffect(() => {
    if (subjectOptions.length > 0 && !subjectOptions.includes(subject)) {
      setSubject(subjectOptions[0]);
    }
  }, [subjectOptions]);

  const filtered = useMemo(() => {
    if (activeFilter === 'All') return assignments;
    if (activeFilter === 'Done') return assignments.filter(a => a.status === 'completed');
    if (activeFilter === 'School') return assignments.filter(a => a.createdBy === 'teacher');
    if (activeFilter === 'Parent') return assignments.filter(a => a.createdBy === 'parent');
    return assignments;
  }, [assignments, activeFilter]);

  const completed = assignments.filter(a => a.status === 'completed').length;
  const pending = assignments.filter(a => a.status === 'pending').length;
  const overdue = assignments.filter(a => {
    if (a.status !== 'pending') return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(a.dueDate) < today;
  }).length;
  const totalStudyMins = childStats?.studyTimeMinutes ?? 0;
  const completionPct = assignments.length > 0 ? Math.round((completed / assignments.length) * 100) : 0;
  const onTrackPct = childStats ? Math.round(((childStats.currentStreak ?? 0) / 7) * 100) : null;

  function resetForm() {
    setTitle(''); setChapter(''); setDueDate(''); setNote('');
    setSubject('Mathematics'); setType('assignment');
    setQuestions(['']); setQuizQuestions([]); setFormError('');
    setAiPrompt(''); setAiGenerated(false); setQuizCount(5); setShowTopicPicker(false);
  }

  async function generateWithAI() {
    if (!aiPrompt.trim()) return;
    if (!child) return;
    setAiGenerating(true);
    setFormError('');
    try {
      const data = await parentAssignmentsService.generateWithAI({
        prompt: aiPrompt.trim(),
        subject,
        grade: child.grade,
        curriculum: child.curriculum || 'IB PYP',
        count: quizCount,
        type,
      });
      setTitle(data.title || '');
      setChapter(data.chapter || '');
      setNote(data.note || '');
      setType(data.type === 'quiz' ? 'quiz' : 'assignment');
      setQuestions(data.questions?.length > 0 ? data.questions : ['']);
      setQuizQuestions(Array.isArray(data.quizQuestions) ? data.quizQuestions : []);
      setAiGenerated(true);
    } catch (e: any) {
      setFormError(e?.message || 'Network error — is the server running?');
    } finally {
      setAiGenerating(false);
    }
  }

  async function createAssignment() {
    if (!title.trim()) { setFormError('Title is required'); return; }
    if (!dueDate.trim()) { setFormError('Due date is required (YYYY-MM-DD)'); return; }
    if (!child) { setFormError('No child selected'); return; }
    setFormError('');
    setCreating(true);
    try {
      const created = await parentAssignmentsService.createAssignment({
        title: title.trim(),
        subject,
        chapter: chapter.trim(),
        dueDate,
        type,
        note: note.trim(),
        studentId: child.id,
        parentEmail,
        grade: child.grade,
        questions: questions.filter(q => q.trim()),
        quizQuestions,
      });
      setAssignments(prev => [created, ...prev]);
      setShowModal(false);
      resetForm();
    } catch (e: any) {
      setFormError(e?.message || 'Network error — is the server running?');
    } finally {
      setCreating(false);
    }
  }

  return {
    parentEmail, children, selectedIdx, setSelectedIdx, child,
    activeFilter, setActiveFilter, filtered, assignments,
    loading, completed, pending, overdue, totalStudyMins, completionPct, onTrackPct,
    showModal, setShowModal, reportAssignment, setReportAssignment,
    detailAssignment, setDetailAssignment,
    title, setTitle, subject, setSubject, subjectOptions,
    chapter, setChapter, dueDate, setDueDate, type, setType, note, setNote,
    questions, setQuestions, quizQuestions, setQuizQuestions,
    creating, formError, setFormError,
    aiPrompt, setAiPrompt, aiGenerating, aiGenerated, quizCount, setQuizCount,
    curriculumTopics, showTopicPicker, setShowTopicPicker,
    resetForm, generateWithAI, createAssignment,
  };
}
