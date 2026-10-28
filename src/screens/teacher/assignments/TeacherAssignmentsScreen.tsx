import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, RefreshControl,
  Platform, KeyboardAvoidingView, Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius } from '../../../theme';
import type { AppColors } from '../../../theme';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import ScreenLayout from '../../../components/common/ScreenLayout';
import Header from '../../../components/common/Header';
import TEACHER_DASHBOARD_SERVER_URL from '../../../config/teacherDashboardServerUrl';

import type { Assignment, StudentItem } from './types';
import {
  TABS, SUBJECTS, ALL_GRADES,
  SUBJECT_COLORS,
} from './constants';
import { validateInteractiveQuizForPublish, findIncompleteTaskStep } from './utils/validation';
import { stripInternalQuizFields } from './utils/quizHtml';
import { buildUploadedExtractedQuestions, buildAssignmentPayload, postCreateAssignment } from './services/assignmentsService';
import { daysUntil, formatDate } from './utils/helpers';
import { useTeacherCurriculumGrade } from './hooks/useTeacherCurriculumGrade';
import { useBulkUpload } from './hooks/useBulkUpload';
import { useUploadWorksheet } from './hooks/useUploadWorksheet';
import { useQuizLibrary } from './hooks/useQuizLibrary';
import { useTaskSteps } from './hooks/useTaskSteps';
import { useIBGeneration } from './hooks/useIBGeneration';
import { useQuizGeneration } from './hooks/useQuizGeneration';
import { useAssignmentsList } from './hooks/useAssignmentsList';
import { useAssignmentDetail } from './hooks/useAssignmentDetail';
import { QuizLibraryPreviewModal } from './components/QuizLibraryPreviewModal';
import { AssignmentDetailModal } from './components/AssignmentDetailModal';
import { DeleteAssignmentConfirm } from './components/DeleteAssignmentConfirm';
import { FullscreenImageViewer } from './components/FullscreenImageViewer';
import { StudentPreviewOverlay } from './components/StudentPreviewOverlay';
import { ReuseQuizModal } from './components/ReuseQuizModal';
import { InteractiveQuizPreviewModal } from './components/InteractiveQuizPreviewModal';
import { AIReportModal } from './components/AIReportModal';
import { PreviewModal } from './components/PreviewModal';
import { CreationModeSelector } from './components/CreationModeSelector';
import { BulkUploadFlow } from './components/BulkUploadFlow';
import { AIAssignmentFlow } from './components/AIAssignmentFlow';
import { WorksheetUploadFlow } from './components/WorksheetUploadFlow';
import { UploadWizardFooter } from './components/UploadWizardFooter';
import { normalizeCurriculum } from '../../../utils/curriculum';

export default function TeacherAssignmentsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const gold = colors.accentYellow;
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState('All');
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Mathematics');
  const {
    teacherCurriculum, defaultGrade,
    grade, setGrade, curriculum, setCurriculum,
    teacherEmail, isIBPYP,
    gradeOptions, effectiveGrade,
    curriculumOptions, effectiveCurriculum, teacherCurricula,
    availableTopics, topicsLoading,
  } = useTeacherCurriculumGrade(user, subject);
  const [chapter, setChapter] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState<'assignment' | 'quiz'>('assignment');
  const [note, setNote] = useState('');
  const [questions, setQuestions] = useState<string[]>(['']);
  const [successCriteria, setSuccessCriteria] = useState<string[]>(['']);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizDifficulty, setQuizDifficulty] = useState<'easy'|'medium'|'hard'>('medium');
  const [quizCount, setQuizCount] = useState(5);
  const [quizType, setQuizType] = useState<'mcq'|'fill_blank'|'mixed'>('mcq');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  // When set, the Preview/Edit Answers modal below is editing a BULK item
  // (not the single-worksheet interactiveQuiz) — reusing the exact same,
  // already-built modal instead of duplicating an edit-answers UI per item.
  const [editingBulkItemId, setEditingBulkItemId] = useState<string | null>(null);
  function closeInteractivePreviewModal() {
    if (editingBulkItemId && interactiveQuiz) {
      const _previewHTML = (interactiveQuiz as any)._previewHTML;
      const cleanQ = stripInternalQuizFields(interactiveQuiz);
      updateBulkItem(editingBulkItemId, { quiz: cleanQ, quizHtml: _previewHTML || '' });
      setEditingBulkItemId(null);
    } else if (createMode === 'upload' && uploadStep === 2) {
      // Approving the quiz on the single-worksheet wizard used to just close this
      // modal and drop the teacher back on step 2, where the Assign-to/specific
      // student section isn't rendered (it's gated to uploadStep === 3) — so the
      // picker looked like it never showed up. Auto-advance instead of making
      // them tap "Next" again to reach it.
      setUploadStep(3);
    }
    setShowInteractivePreview(false);
  }
  // Creation mode: 'choose' (initial), 'ai' (IB PYP AI), 'upload' (PDF/Image worksheet),
  // 'bulk' (several separate worksheets → one assignment each, published together)
  const [createMode, setCreateMode] = useState<'choose' | 'ai' | 'upload' | 'bulk'>('choose');
  // Bulk upload is a 3-PHASE batch flow (industry-standard shape for bulk
  // import: review all → process all → finalize all — not a repeated
  // single-item wizard): 'classify' (preview + edit subject/grade/title for
  // ALL worksheets at once) → 'generate' (quiz generated + previewable for
  // ALL worksheets) → 'assign' (choose assign-to per worksheet, one Publish
  // All action). Every worksheet is a BulkItem tracked independently (type
  // imported from ./types). See useBulkUpload(), called below once `load`
  // is defined.
  const [reportAssignment, setReportAssignment] = useState<Assignment | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [studentPreviewHtml, setStudentPreviewHtml] = useState<string | null>(null);
  const [showReuseQuizModal, setShowReuseQuizModal] = useState(false);
  const [savedQuizzes, setSavedQuizzes] = useState<any[]>([]);
  const [loadingSavedQuizzes, setLoadingSavedQuizzes] = useState(false);

  // IB PYP fields
  // No hardcoded default — an arbitrary starting language (e.g. always "Telugu")
  // looked auto-filled to the teacher even when the worksheet was actually
  // English and extraction correctly declined to guess a language for it.
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [unitOfInquiry, setUnitOfInquiry] = useState('');
  const [ibPurpose, setIbPurpose] = useState('');
  const [ibLearningOutcomes, setIbLearningOutcomes] = useState<string[]>(['']);
  const [ibWordBank, setIbWordBank] = useState<string[]>([]);
  const [ibStamps, setIbStamps] = useState<string[]>([]);
  const [ibCentralIdea, setIbCentralIdea] = useState('');
  const [ibLinesOfInquiry, setIbLinesOfInquiry] = useState<string[]>([]);
  const [ibLearnerProfile, setIbLearnerProfile] = useState('');
  const [ibAtlSkill, setIbAtlSkill] = useState('');
  const [ibKeyConcept, setIbKeyConcept] = useState('');

  // Student picker
  const [students, setStudents] = useState<StudentItem[]>([]);
  // Distinguishes "still fetching" from "genuinely no students" — without this,
  // the picker could flash "No students linked yet" if the teacher reached the
  // Specific-student step before the by-teacher fetch (below) had resolved.
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [assignTo, setAssignTo] = useState<'all' | 'specific'>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [studentSearch, setStudentSearch] = useState('');

  const {
    assignments, setAssignments, loading, refreshing, setRefreshing,
    load, markComplete, deleteAssignment,
  } = useAssignmentsList({ teacherEmail });
  const [pendingDelete, setPendingDelete] = useState<Assignment | null>(null);
  const requestDelete = (id: string) => setPendingDelete(assignments.find(a => a.id === id) ?? null);

  const {
    detailAssignment, setDetailAssignment, detailTab, setDetailTab,
    detailSubmissions, detailTotalLinked, loadingSubmissions,
    expandedStudent, setExpandedStudent,
    teacherFeedback, setTeacherFeedback, sendingFeedback, sendFeedback,
    editingFeedbackFor, setEditingFeedbackFor,
  } = useAssignmentDetail(teacherEmail);

  const {
    bulkPhase, setBulkPhase, bulkItems, setBulkItems, bulkDueDate, setBulkDueDate,
    updateBulkItem, pickBulkDocs, generateOneBulkQuiz, generateAllBulkQuizzes, publishAllBulkItems,
    resetBulkState,
    pendingImages, imageSelection, imageGroups,
    toggleImageSelection, confirmImageGroup, dissolveImageGroup, groupedImageIds, finishImageGrouping,
  } = useBulkUpload({
    user, teacherEmail, effectiveGrade, effectiveCurriculum, gradeOptions,
    setAssignments, reloadAssignments: load,
  });

  const {
    docFiles, setDocFiles, uploadingDoc, extractingQuestions,
    extractedQuestions, showPreview, setShowPreview,
    interactiveQuiz, setInteractiveQuiz, generatingInteractiveQuiz,
    showInteractivePreview, setShowInteractivePreview,
    uploadStep, setUploadStep, uploadScrollRef,
    pickDoc, generateInteractiveQuiz, resetUploadState,
  } = useUploadWorksheet({
    user, title, setTitle, chapter, setChapter, subject, setSubject, grade, setGrade, curriculum, setCurriculum,
    gradeOptions, effectiveGrade, effectiveCurriculum, selectedLanguage, setSelectedLanguage,
    setSuccessCriteria, setTeacherNotes, setIbWordBank, setIbStamps, setFormError,
    quizDifficulty, setQuizQuestions, setType, teacherCurricula,
  });

  const {
    librarySubject, setLibrarySubject, libraryGrade, setLibraryGrade,
    libraryQuizzes, libraryLoading, libraryLoaded,
    libraryPreviewQuiz, setLibraryPreviewQuiz, libraryPreviewLoading,
    openLibraryPreview,
  } = useQuizLibrary({ activeTab, teacherEmail });

  const {
    taskSteps, setTaskSteps, generatingSteps, stepsError,
    addTaskStep, updateTaskStep, removeTaskStep, generateSteps, fillStepWithAI, fillingStepId,
  } = useTaskSteps({ title, chapter, subject, effectiveGrade, effectiveCurriculum, selectedLanguage });

  const { generatingIB, generateIBAssignment } = useIBGeneration({
    title, chapter, unitOfInquiry, subject, effectiveGrade, effectiveCurriculum, selectedLanguage,
    setFormError, setIbPurpose, setIbCentralIdea, setIbLinesOfInquiry, setIbLearnerProfile,
    setIbAtlSkill, setIbKeyConcept, setIbLearningOutcomes, setTaskSteps, setSuccessCriteria,
    setIbWordBank, setIbStamps,
  });

  const { generatingQuiz, generateQuiz } = useQuizGeneration({
    chapter, subject, grade, curriculum, quizDifficulty, quizCount, quizType, teacherNotes,
    selectedLanguage, setQuizQuestions, setQuestions, setFormError,
  });

  // Browser back button closes modals instead of navigating away
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const isOpen = showInteractivePreview || !!studentPreviewHtml;
    if (isOpen) {
      window.history.pushState({ modal: true }, '');
      const onPop = () => {
        if (showInteractivePreview) setShowInteractivePreview(false);
        if (studentPreviewHtml) setStudentPreviewHtml(null);
      };
      window.addEventListener('popstate', onPop);
      return () => window.removeEventListener('popstate', onPop);
    }
  }, [showInteractivePreview, studentPreviewHtml]);

  // Warn before a refresh/tab-close silently discards an in-progress AI-generated quiz —
  // it only lives in memory until "Approve & Save" is pressed, so a stray F5 loses it
  // with no way to recover (there's no draft id to reload it from).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!(showInteractivePreview && interactiveQuiz)) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [showInteractivePreview, interactiveQuiz]);

  // Keep curriculum + grade in sync when user profile loads after initial render.
  // Keyed on the values, not the teaches[] array: a profile refresh with the
  // same values must not reset a grade/curriculum detected from a worksheet.
  const profileCurriculum = user?.teaches?.[0]?.curriculum || user?.curriculum;
  const profileGrade = user?.teaches?.[0]?.grade;
  useEffect(() => {
    if (profileCurriculum) setCurriculum(profileCurriculum);
    if (profileGrade) setGrade(profileGrade);
  }, [profileCurriculum, profileGrade]);

  // Re-fetch the student list on EVERY focus (not just mount) so a student the
  // teacher just added shows up in the assign picker instantly — no manual refresh.
  useFocusEffect(useCallback(() => {
    if (!teacherEmail) return;
    fetch(`${TEACHER_DASHBOARD_SERVER_URL}/student/by-teacher/${encodeURIComponent(teacherEmail)}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: StudentItem[]) => {
        // Filter to only show students matching the teacher's curriculum
        const tc = user?.teaches?.[0]?.curriculum || user?.curriculum || '';
        const matched = tc
          ? data.filter(s => !s.curriculum || s.curriculum === tc)
          : data;

        // Only show students actually linked to this teacher — no fallback
        // to by-curriculum, which would show students from other classes.
        setStudents(matched);
      })
      .catch(() => {})
      .finally(() => setStudentsLoaded(true));
  }, [teacherEmail, user?.curriculum, user?.school]));

  const filtered = assignments.filter(a => {
    if (activeTab === 'Active') return a.status === 'pending';
    if (activeTab === 'Completed') return a.status === 'completed';
    return true;
  });

  const stats = {
    total: assignments.length,
    active: assignments.filter(a => a.status === 'pending').length,
    completed: assignments.filter(a => a.status === 'completed').length,
    overdue: assignments.filter(a => a.status === 'pending' && new Date(a.dueDate) < new Date()).length,
  };

  async function createAssignment() {
    if (!title.trim()) { setFormError('Title is required'); return; }
    if (!dueDate.trim()) { setFormError('Due date is required'); return; }
    if (type === 'quiz' && quizQuestions.length === 0) { setFormError('Generate quiz questions first before assigning this quiz.'); return; }
    const incompleteStep = type === 'assignment' ? findIncompleteTaskStep(taskSteps) : null;
    if (incompleteStep) { setFormError(incompleteStep); return; }
    // ── Pre-publish validation gate (issue #6) — never publish a wrong/incomplete
    //    interactive quiz. Blocks on: wrong worksheet, empty task cards. ──
    if (interactiveQuiz) {
      const gate = validateInteractiveQuizForPublish(interactiveQuiz, docFiles);
      if (!gate.ok) { setFormError(gate.error); return; }
    }
    setFormError('');
    setCreating(true);
    console.log('[createAssignment] Publishing...', { title, subject, grade, curriculum, type, dueDate, docFiles: docFiles.length, questions: questions.length, quizQuestions: quizQuestions.length });
    try {
      const uploadedExtracted = buildUploadedExtractedQuestions(extractedQuestions);

      const payload = buildAssignmentPayload({
        title, subject, chapter, dueDate, type, assignTo, selectedStudentId: selectedStudent?.id ?? null,
        teacherEmail, grade, curriculum, questions, uploadedExtracted, extractedQuestions,
        ibLearningOutcomes, successCriteria, taskSteps, ibWordBank, quizQuestions, interactiveQuiz, docFiles,
        ibPurpose, note, unitOfInquiry, selectedLanguage, ibCentralIdea, ibLinesOfInquiry,
        ibLearnerProfile, ibAtlSkill, ibKeyConcept,
      });

      const result = await postCreateAssignment(payload);
      if (result.ok) {
        setAssignments(prev => [result.data, ...prev]);
        setShowPreview(false);
        setShowModal(false);
        resetForm();
      } else {
        setFormError(result.error);
      }
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setTitle(''); setChapter(''); setDueDate(''); setNote('');
    setSubject('Mathematics');
    setGrade(user?.teaches?.[0]?.grade || 'Grade 3');
    setCurriculum(user?.teaches?.[0]?.curriculum || user?.curriculum || 'CBSE');
    setType('assignment'); setQuestions(['']); setSuccessCriteria(['']); setTaskSteps([]); setQuizQuestions([]); setTeacherNotes(''); setFormError('');
    setAssignTo('all'); setSelectedStudent(null); setStudentSearch('');
    setCreateMode('choose');
    setShowReuseQuizModal(false); setSavedQuizzes([]);
    setSelectedLanguage(''); setUnitOfInquiry(''); setIbPurpose('');
    setIbLearningOutcomes(['']); setIbWordBank([]); setIbStamps([]);
    setIbCentralIdea(''); setIbLinesOfInquiry([]); setIbLearnerProfile(''); setIbAtlSkill(''); setIbKeyConcept('');
    resetBulkState();
    resetUploadState();
  }


  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Assignments"
          subtitle="Manage and track student assignments"
          onMenuPress={() => navigation.openDrawer()}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accentYellow} />}
        >
          {/* Stats Row */}
          <View style={styles.statsRow}>
            {[
              { label: 'Total', value: stats.total, color: gold },
              { label: 'Active', value: stats.active, color: colors.accentYellow },
              { label: 'Completed', value: stats.completed, color: colors.accentGreen },
              { label: 'Overdue', value: stats.overdue, color: colors.accentRed },
            ].map((s) => (
              <View key={s.label} style={styles.statCard}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Quiz Library Hook Banner */}
          {activeTab !== 'Quiz Library' && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setActiveTab('Quiz Library')}
              style={{ marginBottom: 12, borderRadius: 14, borderWidth: 1.5, borderColor: gold + '50', backgroundColor: gold + '18', flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: gold + '25', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="zap" size={18} color={gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMain }}>Save time. Reuse a saved quiz!</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Tap to explore Quiz Library and assign in seconds.</Text>
              </View>
              <Feather name="chevron-right" size={16} color={gold} />
            </TouchableOpacity>
          )}

          {/* Create button + Tabs row */}
          <View style={styles.actionsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.createBtn, activeTab === 'Quiz Library' ? { backgroundColor: gold } : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: gold }]}
              onPress={() => setActiveTab(activeTab === 'Quiz Library' ? 'All' : 'Quiz Library')}
              activeOpacity={0.85}
            >
              <Feather name="book-open" size={15} color={activeTab === 'Quiz Library' ? '#0F0F0F' : gold} />
              <Text style={[styles.createBtnText, { color: activeTab === 'Quiz Library' ? '#0F0F0F' : gold }]}>Library</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createBtn} onPress={() => setShowModal(true)} activeOpacity={0.85}>
              <Feather name="plus" size={15} color="#fff" />
              <Text style={styles.createBtnText}>New</Text>
            </TouchableOpacity>
          </View>

          {/* ── QUIZ LIBRARY TAB ── */}
          {activeTab === 'Quiz Library' && (
            <View style={{ flex: 1 }}>
              {/* Subject + Grade filters */}
              <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 10 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {['', ...SUBJECTS].map((s) => (
                    <TouchableOpacity
                      key={s || 'all'}
                      style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: librarySubject === s ? gold : colors.borderColor, backgroundColor: librarySubject === s ? gold + '20' : 'transparent' }}
                      onPress={() => setLibrarySubject(s)}
                      activeOpacity={0.75}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: librarySubject === s ? gold : colors.textDim }}>{s || 'All Subjects'}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {['', ...ALL_GRADES].map((g) => (
                    <TouchableOpacity
                      key={g || 'all'}
                      style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: libraryGrade === g ? gold : colors.borderColor, backgroundColor: libraryGrade === g ? gold + '20' : 'transparent' }}
                      onPress={() => setLibraryGrade(g)}
                      activeOpacity={0.75}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: libraryGrade === g ? gold : colors.textDim }}>{g || 'All Grades'}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Results */}
              <View style={{ marginTop: 10, paddingHorizontal: 16, flex: 1 }}>
                {libraryLoading ? (
                  <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 32 }} />
                ) : libraryLoaded && libraryQuizzes.length === 0 ? (
                  <View style={styles.empty}>
                    <Feather name="inbox" size={36} color={colors.textDim} />
                    <Text style={styles.emptyTitle}>No quizzes found</Text>
                    <Text style={styles.emptyText}>No saved quizzes match these filters.</Text>
                    <TouchableOpacity
                      style={[styles.createBtn, { marginTop: 16, paddingHorizontal: 20 }]}
                      onPress={() => { setActiveTab('All'); setShowModal(true); }}
                      activeOpacity={0.85}
                    >
                      <Feather name="plus" size={15} color="#fff" />
                      <Text style={styles.createBtnText}>Create New Quiz</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {libraryQuizzes.map((q) => {
                    const subjectColor = SUBJECT_COLORS[q.subject] || gold;
                    const questionCount = q.quiz_data?.tasks?.reduce((s: number, t: any) => s + (t.questions?.length || 0), 0) || 0;
                    return (
                      <TouchableOpacity key={q.id} style={[styles.card, { width: '47.5%', minWidth: 280 }]} activeOpacity={0.85} onPress={() => openLibraryPreview(q)}>
                        <View style={[styles.cardAccent, { backgroundColor: subjectColor }]} />
                        <View style={styles.cardBody}>
                          <View style={styles.cardTop}>
                            <View style={{ flex: 1 }}>
                              <View style={styles.cardMeta}>
                                <View style={[styles.typePill, { backgroundColor: subjectColor + '20', borderColor: subjectColor + '50' }]}>
                                  <Text style={[styles.typeText, { color: subjectColor }]}>quiz</Text>
                                </View>
                                {q.subject ? <Text style={styles.subjectLabel}>{q.subject}</Text> : null}
                                {q.grade ? <Text style={styles.subjectLabel}>{q.grade}</Text> : null}
                              </View>
                              <Text style={styles.cardTitle}>{q.title}</Text>
                              <Text style={[styles.cardChapter, { marginTop: 2 }]}>
                                {questionCount > 0 ? `${questionCount} questions` : 'Interactive quiz'}{q.created_at ? ` · ${q.created_at.slice(0, 10)}` : ''}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: subjectColor, alignItems: 'center', justifyContent: 'center' }}
                              activeOpacity={0.8}
                              onPress={() => {
                                // Pre-load quiz, open the wizard at Step 3, AND open the same
                                // Preview/Edit Answers screen the normal upload flow uses —
                                // previously this only set wizard state and never opened that
                                // modal, so a reused-from-library quiz landed on a bare "assign"
                                // step with no way to edit answers/hints before publishing.
                                setInteractiveQuiz({ ...q.quiz_data, _editMode: false });
                                setSubject(q.subject || 'Mathematics');
                                setGrade(q.grade || defaultGrade);
                                setCurriculum(q.curriculum || teacherCurriculum);
                                setChapter(q.chapter || '');
                                setTitle(q.title || '');
                                setCreateMode('upload');
                                setUploadStep(3);
                                setShowModal(true);
                                setShowInteractivePreview(true);
                                uploadScrollRef.current?.scrollTo({ y: 0, animated: false });
                              }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Assign</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Assignment List */}
          {activeTab !== 'Quiz Library' && (loading ? (
            <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="check-square" size={36} color={colors.textDim} />
              <Text style={styles.emptyTitle}>No assignments yet</Text>
              <Text style={styles.emptyText}>Tap &quot;New&quot; to create your first assignment</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {filtered.map((a) => {
              const due = daysUntil(a.dueDate);
              const subjectColor = SUBJECT_COLORS[a.subject] || gold;
              return (
                <TouchableOpacity key={a.id} style={[styles.card, { width: '47.5%', minWidth: 280 }]} activeOpacity={0.85} onPress={() => setDetailAssignment(a)}>
                  <View style={[styles.cardAccent, { backgroundColor: subjectColor }]} />
                  <View style={styles.cardBody}>
                    {/* Header */}
                    <View style={styles.cardTop}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.cardMeta}>
                          <View style={[styles.typePill, { backgroundColor: subjectColor + '20', borderColor: subjectColor + '50' }]}>
                            <Text style={[styles.typeText, { color: subjectColor }]}>{a.type}</Text>
                          </View>
                          <Text style={styles.subjectLabel}>{a.subject}</Text>
                          {a.grade ? <Text style={styles.subjectLabel}>{a.grade}</Text> : null}
                          {a.curriculum ? <Text style={styles.subjectLabel}>{normalizeCurriculum(a.curriculum)}</Text> : null}
                          {a.studentId === null && (
                            <View style={styles.broadcastPill}>
                              <Feather name="users" size={9} color={gold} />
                              <Text style={styles.broadcastText}>All students</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.cardTitle}>{a.title}</Text>
                        {a.chapter ? <Text style={styles.cardChapter}>{a.chapter}</Text> : null}
                      </View>
                      {a.status === 'completed' ? (
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          {a.score != null && (
                            <View style={[styles.completedBadge, { backgroundColor: subjectColor + '20', borderColor: subjectColor + '40' }]}>
                              <Text style={[styles.statusText, { color: subjectColor, fontSize: 13, fontWeight: '800' }]}>{a.score}%</Text>
                            </View>
                          )}
                          <View style={styles.completedBadge}>
                            <Feather name="check" size={12} color={colors.accentGreen} />
                            <Text style={[styles.statusText, { color: colors.accentGreen }]}>Done</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.pendingBadge, due.overdue && styles.overdueBadge]}>
                          <Feather name="clock" size={12} color={due.overdue ? colors.accentRed : colors.accentYellow} />
                          <Text style={[styles.statusText, { color: due.overdue ? colors.accentRed : colors.accentYellow }]}>{due.label}</Text>
                        </View>
                      )}
                    </View>

                    {/* Footer */}
                    <View style={styles.cardFooter}>
                      <Text style={styles.dueDateText}>
                        <Feather name="calendar" size={11} /> {formatDate(a.dueDate)}
                      </Text>
                      <View style={styles.cardActions}>
                        {a.status === 'completed' && a.aiFeedback && (
                          <TouchableOpacity style={[styles.actionBtn, { borderColor: subjectColor + '50', backgroundColor: subjectColor + '12' }]} onPress={() => setReportAssignment(a)} activeOpacity={0.75}>
                            <Feather name="bar-chart-2" size={13} color={subjectColor} />
                            <Text style={[styles.actionBtnLabel, { color: subjectColor }]}>Report</Text>
                          </TouchableOpacity>
                        )}
                        {a.status === 'pending' && (
                          <TouchableOpacity style={styles.actionBtn} onPress={() => markComplete(a.id)} activeOpacity={0.75}>
                            <Feather name="check" size={13} color={colors.accentGreen} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity testID={`delete-assignment-${a.id}`} style={styles.actionBtn} onPress={() => requestDelete(a.id)} activeOpacity={0.75}>
                          <Feather name="trash-2" size={13} color={colors.accentRed} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {a.note ? <Text style={styles.noteText}>{a.note}</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
            </View>
          ))}
        </ScrollView>

        {/* Quiz Library Preview Modal */}
        {libraryPreviewQuiz && (
          <QuizLibraryPreviewModal
            quiz={libraryPreviewQuiz}
            loading={libraryPreviewLoading}
            colors={colors}
            gold={gold}
            styles={styles}
            onClose={() => setLibraryPreviewQuiz(null)}
            onAssign={(q) => {
              setLibraryPreviewQuiz(null);
              // Same fix as the card grid's Assign button — actually open the
              // Preview/Edit Answers screen, not just wizard state, so answers
              // and hints are editable before publishing a reused quiz.
              setInteractiveQuiz({ ...q.quiz_data, _editMode: false });
              setSubject(q.subject || 'Mathematics');
              setGrade(q.grade || defaultGrade);
              setCurriculum(q.curriculum || teacherCurriculum);
              setChapter(q.chapter || '');
              setTitle(q.title || '');
              setCreateMode('upload');
              setUploadStep(3);
              setShowModal(true);
              setShowInteractivePreview(true);
              uploadScrollRef.current?.scrollTo({ y: 0, animated: false });
            }}
          />
        )}

        <DeleteAssignmentConfirm
          title={pendingDelete ? pendingDelete.title : null}
          colors={colors}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => { if (pendingDelete) deleteAssignment(pendingDelete.id); setPendingDelete(null); }}
        />

        {/* Assignment Detail Modal */}
        {detailAssignment && (
          <AssignmentDetailModal
            assignment={detailAssignment}
            detailTab={detailTab} setDetailTab={setDetailTab}
            detailSubmissions={detailSubmissions} detailTotalLinked={detailTotalLinked}
            loadingSubmissions={loadingSubmissions}
            expandedStudent={expandedStudent} setExpandedStudent={setExpandedStudent}
            teacherFeedback={teacherFeedback} setTeacherFeedback={setTeacherFeedback}
            sendingFeedback={sendingFeedback} sendFeedback={sendFeedback}
            editingFeedbackFor={editingFeedbackFor} setEditingFeedbackFor={setEditingFeedbackFor}
            markComplete={markComplete} deleteAssignment={requestDelete}
            onClose={() => setDetailAssignment(null)}
            onImagePress={(uri) => setFullscreenImage(uri)}
            onPreviewHtml={(html) => setStudentPreviewHtml(html)}
            colors={colors} gold={gold} styles={styles}
          />
        )}

        {/* Fullscreen Image Viewer */}
        {fullscreenImage && (
          <FullscreenImageViewer uri={fullscreenImage} onClose={() => setFullscreenImage(null)} />
        )}

        {/* Student Preview Overlay */}
        {studentPreviewHtml && (
          <StudentPreviewOverlay html={studentPreviewHtml} colors={colors} onClose={() => setStudentPreviewHtml(null)} />
        )}
        {/* Reuse Quiz Modal */}
        <ReuseQuizModal
          visible={showReuseQuizModal}
          loading={loadingSavedQuizzes}
          quizzes={savedQuizzes}
          subject={subject}
          colors={colors}
          gold={gold}
          onClose={() => setShowReuseQuizModal(false)}
          setInteractiveQuiz={setInteractiveQuiz}
        />

        {/* Interactive Quiz Preview Modal — unified server-rendered HTML + edit mode.
            Also reused for bulk-upload items (see editingBulkItemId) so the SAME
            Preview/Edit Answers screen works for both flows, not a duplicate. */}
        {showInteractivePreview && interactiveQuiz && (
          <InteractiveQuizPreviewModal
            quiz={interactiveQuiz}
            setQuiz={setInteractiveQuiz}
            onClose={closeInteractivePreviewModal}
          />
        )}

        {/* AI Report Modal */}
        {reportAssignment && (
          <AIReportModal
            assignment={reportAssignment}
            colors={colors}
            onClose={() => setReportAssignment(null)}
          />
        )}

        {/* Create Assignment Modal
            Hidden while a preview is open: this wizard modal renders LATER in the
            tree than the interactive/student preview modals, so RN stacks it ON
            TOP — which showed the "Generate Quiz" wizard floating over the
            split-screen preview. Collapsing it to invisible while a preview is up
            keeps the wizard's state (uploadStep etc.) intact so closing the
            preview returns the teacher exactly where they were. */}
        <Modal visible={showModal && !showInteractivePreview && !studentPreviewHtml} animationType="slide" transparent onRequestClose={() => { setShowModal(false); resetForm(); }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={[styles.modalOverlay, createMode === 'choose' && { justifyContent: 'center' }]}>
              <View style={[styles.modalSheet, createMode === 'choose' && { maxHeight: undefined, borderRadius: 20 }]}>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    {createMode !== 'choose' && (
                      <TouchableOpacity onPress={() => {
                        if (createMode === 'upload' && uploadStep > 1) {
                          setUploadStep((uploadStep - 1) as 1 | 2 | 3);
                          setFormError('');
                          uploadScrollRef.current?.scrollTo({ y: 0, animated: true });
                        } else if (createMode === 'bulk' && bulkPhase === 'generate') {
                          setBulkPhase('classify');
                        } else if (createMode === 'bulk' && bulkPhase === 'assign') {
                          setBulkPhase('generate');
                        } else {
                          setCreateMode('choose');
                        }
                      }} activeOpacity={0.75}>
                        <Feather name="arrow-left" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                    <Text style={styles.modalTitle}>
                      {createMode === 'choose' ? 'Create Assignment'
                        : createMode === 'ai' ? 'AI Assignment'
                        : createMode === 'bulk' ? 'Bulk Upload'
                        : uploadStep === 1 ? 'Upload & Classify'
                        : uploadStep === 2 ? 'Generate Quiz'
                        : 'Assign & Publish'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }} activeOpacity={0.75}>
                    <Feather name="x" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* ── UPLOAD WIZARD STEPPER ── */}
                {createMode === 'upload' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
                    {([
                      { num: 1 as const, label: 'Upload' },
                      { num: 2 as const, label: 'Generate' },
                      { num: 3 as const, label: 'Publish' },
                    ]).map((s, i) => (
                      <React.Fragment key={s.num}>
                        {i > 0 && (
                          <View style={{ flex: 1, height: 2, marginHorizontal: 8, backgroundColor: uploadStep >= s.num ? gold : colors.borderColor, borderRadius: 1 }} />
                        )}
                        <View style={{ alignItems: 'center' }}>
                          <View style={{
                            width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                            backgroundColor: uploadStep >= s.num ? gold : colors.bgDark,
                            borderWidth: uploadStep >= s.num ? 0 : 1.5,
                            borderColor: colors.borderColor,
                          }}>
                            {uploadStep > s.num ? (
                              <Feather name="check" size={14} color="#fff" />
                            ) : (
                              <Text style={{ fontSize: 13, fontWeight: '800', color: uploadStep >= s.num ? '#fff' : colors.textDim }}>{s.num}</Text>
                            )}
                          </View>
                          <Text style={{ fontSize: 10, fontWeight: '600', marginTop: 4, color: uploadStep === s.num ? gold : colors.textDim }}>{s.label}</Text>
                        </View>
                      </React.Fragment>
                    ))}
                  </View>
                )}

                <ScrollView ref={uploadScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.modalContent, createMode === 'choose' && { flex: 1, justifyContent: 'center' }]}>

                  {createMode === 'choose' && (
                    <CreationModeSelector
                      isIBPYP={isIBPYP} gold={gold} colors={colors}
                      setCreateMode={setCreateMode} setType={setType} setUploadStep={setUploadStep}
                      uploadScrollRef={uploadScrollRef} setBulkPhase={setBulkPhase} setBulkItems={setBulkItems}
                    />
                  )}

                  {createMode === 'bulk' && (
                    <BulkUploadFlow
                      bulkPhase={bulkPhase} setBulkPhase={setBulkPhase} bulkItems={bulkItems}
                      updateBulkItem={updateBulkItem} pickBulkDocs={pickBulkDocs}
                      generateAllBulkQuizzes={generateAllBulkQuizzes} generateOneBulkQuiz={generateOneBulkQuiz}
                      publishAllBulkItems={publishAllBulkItems}
                      pendingImages={pendingImages} imageSelection={imageSelection} imageGroups={imageGroups}
                      toggleImageSelection={toggleImageSelection} confirmImageGroup={confirmImageGroup}
                      dissolveImageGroup={dissolveImageGroup} groupedImageIds={groupedImageIds}
                      finishImageGrouping={finishImageGrouping}
                      gradeOptions={gradeOptions} curriculum={effectiveCurriculum} setFullscreenImage={setFullscreenImage}
                      setEditingBulkItemId={setEditingBulkItemId} setInteractiveQuiz={setInteractiveQuiz}
                      setShowInteractivePreview={setShowInteractivePreview}
                      bulkDueDate={bulkDueDate} setBulkDueDate={setBulkDueDate}
                      students={students} studentsLoaded={studentsLoaded}
                      setShowModal={setShowModal} resetForm={resetForm}
                      colors={colors} gold={gold} styles={styles}
                    />
                  )}

                  {createMode === 'upload' && (
                    <WorksheetUploadFlow
                      uploadStep={uploadStep} docFiles={docFiles} setDocFiles={setDocFiles}
                      setQuestions={setQuestions} setFullscreenImage={setFullscreenImage}
                      pickDoc={pickDoc} uploadingDoc={uploadingDoc} extractingQuestions={extractingQuestions}
                      title={title} setTitle={setTitle} subject={subject} setSubject={setSubject}
                      selectedLanguage={selectedLanguage} setSelectedLanguage={setSelectedLanguage}
                      grade={grade} setGrade={setGrade} effectiveGrade={effectiveGrade} gradeOptions={gradeOptions} isIBPYP={isIBPYP}
                      curriculum={curriculum} setCurriculum={setCurriculum} effectiveCurriculum={effectiveCurriculum}
                      curriculumOptions={curriculumOptions} teacherCurriculum={teacherCurriculum}
                      chapter={chapter} setChapter={setChapter} topicsLoading={topicsLoading} availableTopics={availableTopics}
                      dueDate={dueDate} setDueDate={setDueDate}
                      interactiveQuiz={interactiveQuiz} generatingInteractiveQuiz={generatingInteractiveQuiz}
                      generateInteractiveQuiz={generateInteractiveQuiz} setShowInteractivePreview={setShowInteractivePreview}
                      teacherEmail={teacherEmail}
                      setLoadingSavedQuizzes={setLoadingSavedQuizzes} setShowReuseQuizModal={setShowReuseQuizModal}
                      setSavedQuizzes={setSavedQuizzes} setStudentPreviewHtml={setStudentPreviewHtml}
                      assignTo={assignTo} setAssignTo={setAssignTo}
                      selectedStudent={selectedStudent} setSelectedStudent={setSelectedStudent}
                      studentSearch={studentSearch} setStudentSearch={setStudentSearch}
                      students={students} studentsLoaded={studentsLoaded}
                      formError={formError}
                      colors={colors} gold={gold} styles={styles}
                    />
                  )}

                  {createMode === 'ai' && (
                    <AIAssignmentFlow
                      type={type} setType={setType} curriculum={curriculum} isIBPYP={isIBPYP}
                      createMode={createMode} docFilesLength={docFiles.length}
                      title={title} setTitle={setTitle} subject={subject} setSubject={setSubject}
                      selectedLanguage={selectedLanguage} setSelectedLanguage={setSelectedLanguage}
                      grade={grade} setGrade={setGrade} effectiveGrade={effectiveGrade} gradeOptions={gradeOptions}
                      setCurriculum={setCurriculum} effectiveCurriculum={effectiveCurriculum}
                      curriculumOptions={curriculumOptions} teacherCurriculum={teacherCurriculum}
                      chapter={chapter} setChapter={setChapter} topicsLoading={topicsLoading} availableTopics={availableTopics}
                      dueDate={dueDate} setDueDate={setDueDate}
                      quizType={quizType} setQuizType={setQuizType}
                      quizDifficulty={quizDifficulty} setQuizDifficulty={setQuizDifficulty}
                      quizCount={quizCount} setQuizCount={setQuizCount}
                      formError={formError} setFormError={setFormError}
                      generatingQuiz={generatingQuiz} generateQuiz={generateQuiz}
                      unitOfInquiry={unitOfInquiry} setUnitOfInquiry={setUnitOfInquiry}
                      generatingIB={generatingIB} generatingSteps={generatingSteps}
                      generateIBAssignment={generateIBAssignment} generateSteps={generateSteps} stepsError={stepsError}
                      ibPurpose={ibPurpose} setIbPurpose={setIbPurpose}
                      ibCentralIdea={ibCentralIdea} setIbCentralIdea={setIbCentralIdea}
                      ibLinesOfInquiry={ibLinesOfInquiry}
                      ibLearnerProfile={ibLearnerProfile} ibAtlSkill={ibAtlSkill} ibKeyConcept={ibKeyConcept}
                      ibLearningOutcomes={ibLearningOutcomes} setIbLearningOutcomes={setIbLearningOutcomes}
                      ibWordBank={ibWordBank} setIbWordBank={setIbWordBank}
                      ibStamps={ibStamps} setIbStamps={setIbStamps}
                      taskSteps={taskSteps} addTaskStep={addTaskStep} updateTaskStep={updateTaskStep} removeTaskStep={removeTaskStep}
                      fillStepWithAI={fillStepWithAI} fillingStepId={fillingStepId}
                      questions={questions} setQuestions={setQuestions}
                      quizQuestions={quizQuestions} setQuizQuestions={setQuizQuestions}
                      successCriteria={successCriteria} setSuccessCriteria={setSuccessCriteria}
                      note={note} setNote={setNote}
                      assignTo={assignTo} setAssignTo={setAssignTo}
                      selectedStudent={selectedStudent} setSelectedStudent={setSelectedStudent}
                      studentSearch={studentSearch} setStudentSearch={setStudentSearch}
                      students={students} studentsLoaded={studentsLoaded}
                      setShowPreview={setShowPreview}
                      colors={colors} gold={gold} styles={styles}
                    />
                  )}
                </ScrollView>

                {/* ── UPLOAD WIZARD FOOTER (fixed at bottom) ── */}
                {createMode === 'upload' && (
                  <UploadWizardFooter
                    uploadStep={uploadStep} setUploadStep={setUploadStep} setFormError={setFormError}
                    uploadScrollRef={uploadScrollRef}
                    docFiles={docFiles} uploadingDoc={uploadingDoc} extractingQuestions={extractingQuestions}
                    interactiveQuiz={interactiveQuiz}
                    title={title} dueDate={dueDate} creating={creating} createAssignment={createAssignment}
                    colors={colors} styles={styles}
                  />
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── PREVIEW MODAL (separate screen) ── */}
        <PreviewModal
          visible={showPreview}
          onClose={() => setShowPreview(false)}
          title={title} subject={subject} grade={grade} curriculum={curriculum} dueDate={dueDate}
          type={type} assignTo={assignTo} selectedStudent={selectedStudent}
          chapter={chapter} note={note}
          quizQuestions={quizQuestions} setQuizQuestions={setQuizQuestions}
          taskSteps={taskSteps} questions={questions} extractedQuestions={extractedQuestions}
          docFiles={docFiles} formError={formError} creating={creating}
          onPublish={createAssignment}
          colors={colors} gold={gold} styles={styles}
        />
      </View>
    </ScreenLayout>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 48, gap: spacing.lg },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: 2,
  },
  statValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: c.textDim, textAlign: 'center', fontWeight: '500' },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tabs: { gap: spacing.sm },
  tab: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.md, borderWidth: 1, borderColor: c.borderColor,
    backgroundColor: c.cardDark,
  },
  tabActive: { backgroundColor: c.accentYellow + '18', borderColor: c.accentYellow },
  tabText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  tabTextActive: { color: c.accentYellow },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.accentYellow, paddingHorizontal: spacing.md, paddingVertical: 9,
    borderRadius: radius.md,
  },
  createBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  empty: { alignItems: 'center', gap: 8, paddingTop: 40, paddingBottom: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: c.textMain },
  emptyText: { fontSize: 13, color: c.textDim },

  card: {
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, overflow: 'hidden', flexDirection: 'row',
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  typePill: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1,
  },
  typeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  subjectLabel: { fontSize: 11, color: c.textDim, fontWeight: '600' },
  broadcastPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: c.accentYellow + '18', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  broadcastText: { fontSize: 9, color: c.accentYellow, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: c.textMain },
  cardChapter: { fontSize: 12, color: c.textMuted, marginTop: 2 },

  completedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: c.accentGreen + '18', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  pendingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: c.accentYellow + '18', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  overdueBadge: { backgroundColor: c.accentRed + '18' },
  statusText: { fontSize: 10, fontWeight: '700' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dueDateText: { fontSize: 12, color: c.textDim },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    height: 28, paddingHorizontal: 8, borderRadius: 8,
    backgroundColor: c.borderColor, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 4, borderWidth: 1, borderColor: c.borderColor,
  },
  actionBtnLabel: { fontSize: 11, fontWeight: '700' },
  noteText: { fontSize: 12, color: c.textDim, fontStyle: 'italic', lineHeight: 18 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalBox: {
    backgroundColor: c.cardDark, borderRadius: radius.lg,
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: c.borderColor, overflow: 'hidden',
    width: '100%', maxWidth: 600,
  },
  modalSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: radius.md,
    backgroundColor: c.accentYellow,
  },
  modalSaveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  modalCancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.bgDark,
  },
  modalCancelBtnText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  modalSheet: {
    backgroundColor: c.cardDark, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', borderWidth: 1, borderColor: c.borderColor,
    width: '100%', maxWidth: 640,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: c.borderColor,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: c.textMain },
  modalContent: { padding: spacing.xl, gap: spacing.md, paddingBottom: 40 },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: c.bgDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12,
    color: c.textMain, fontSize: 14,
  },
  inputMulti: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md,
    borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.bgDark,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  uploadDocBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.borderColor,
    borderRadius: radius.md, padding: spacing.md,
    backgroundColor: c.bgDark,
  },
  uploadDocText: { fontSize: 13, fontWeight: '500', color: c.textMuted, flex: 1 },
  broadcastNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.accentYellow + '18', borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: c.accentYellow + '30',
  },
  broadcastNoteText: { fontSize: 12, color: c.accentYellow, flex: 1 },
  errorText: { fontSize: 13, color: c.accentRed, fontWeight: '600' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: c.accentYellow, padding: 16, borderRadius: radius.md, marginTop: spacing.sm,
  },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Student picker
  studentPickerBox: { borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.md, overflow: 'hidden' },
  studentSearch: {
    backgroundColor: c.bgDark, borderBottomWidth: 1, borderBottomColor: c.borderColor,
    padding: spacing.md, color: c.textMain, fontSize: 13,
  },
  studentList:          { maxHeight: 160 },
  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: c.borderColor + '60',
  },
  studentAvatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: c.accentYellow + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  studentAvatarText:    { fontSize: 13, fontWeight: '700', color: c.accentYellow },
  studentRowName:       { fontSize: 13, fontWeight: '600', color: c.textMain },
  studentRowGrade:      { fontSize: 11, color: c.textDim },
  selectedStudentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: spacing.md, backgroundColor: c.accentYellow + '14',
  },
  selectedStudentName:  { fontSize: 13, fontWeight: '600', color: c.textMain, flex: 1 },
  selectedStudentGrade: { fontSize: 11, color: c.textDim },
});

