import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { StudentItem } from '../types';
import { generateQuizHTMLPreview } from '../utils/quizHtml';
import SERVER_URL from '../../../../config/serverUrl';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';
import { AssignmentCommonFields } from './AssignmentCommonFields';
import { AssignToPicker } from './AssignToPicker';

// The single-Worksheet Upload wizard's scrollable body — UploadStep
// (pick/classify page 1), ClassificationStep (shared common fields, gated
// per-step), and ReviewStep (generate interactive quiz + assign-to on step
// 3) — extracted verbatim (no behavior change) from
// TeacherAssignmentsScreen.tsx, as part of splitting the Create Assignment
// Modal wizard into per-flow components (2026-08-25), following the design
// the user specified. The footer (Back/Next/Publish) lives outside the
// modal's ScrollView, so it's a separate sibling component
// (UploadWizardFooter), not part of this one.
export function WorksheetUploadFlow(props: {
  uploadStep: 1 | 2 | 3;
  docFiles: { name: string; base64: string; mime: string; url?: string }[];
  setDocFiles: React.Dispatch<React.SetStateAction<{ name: string; base64: string; mime: string; url?: string; sourcePdfBase64?: string; sourcePdfName?: string }[]>>;
  setQuestions: React.Dispatch<React.SetStateAction<string[]>>;
  setFullscreenImage: (uri: string) => void;
  pickDoc: () => void;
  uploadingDoc: boolean;
  extractingQuestions: boolean;
  title: string; setTitle: (v: string) => void;
  subject: string; setSubject: (v: string) => void;
  selectedLanguage: string; setSelectedLanguage: (v: string) => void;
  grade: string; setGrade: (v: string) => void;
  effectiveGrade: string; gradeOptions: string[]; isIBPYP: boolean;
  curriculum: string; setCurriculum: (v: string) => void;
  effectiveCurriculum: string; curriculumOptions: string[]; teacherCurriculum: string;
  chapter: string; setChapter: (v: string) => void;
  topicsLoading: boolean; availableTopics: string[];
  dueDate: string; setDueDate: (v: string) => void;
  interactiveQuiz: any; generatingInteractiveQuiz: boolean; generateInteractiveQuiz: () => void;
  setShowInteractivePreview: (v: boolean) => void;
  teacherEmail: string;
  setLoadingSavedQuizzes: (v: boolean) => void;
  setShowReuseQuizModal: (v: boolean) => void;
  setSavedQuizzes: (v: any[]) => void;
  setStudentPreviewHtml: (html: string) => void;
  assignTo: 'all' | 'specific'; setAssignTo: (v: 'all' | 'specific') => void;
  selectedStudent: StudentItem | null; setSelectedStudent: (s: StudentItem | null) => void;
  studentSearch: string; setStudentSearch: (v: string) => void;
  students: StudentItem[]; studentsLoaded: boolean;
  formError: string;
  colors: AppColors; gold: string; styles: any;
}) {
  const {
    uploadStep, docFiles, setDocFiles, setQuestions, setFullscreenImage, pickDoc, uploadingDoc, extractingQuestions,
    title, setTitle, subject, setSubject, selectedLanguage, setSelectedLanguage,
    grade, setGrade, effectiveGrade, gradeOptions, isIBPYP,
    curriculum, setCurriculum, effectiveCurriculum, curriculumOptions, teacherCurriculum,
    chapter, setChapter, topicsLoading, availableTopics, dueDate, setDueDate,
    interactiveQuiz, generatingInteractiveQuiz, generateInteractiveQuiz, setShowInteractivePreview,
    teacherEmail, setLoadingSavedQuizzes, setShowReuseQuizModal, setSavedQuizzes, setStudentPreviewHtml,
    assignTo, setAssignTo, selectedStudent, setSelectedStudent, studentSearch, setStudentSearch,
    students, studentsLoaded, formError, colors, gold, styles,
  } = props;

  return (
    <>
      {/* ── UPLOAD WORKSHEET (Step 1 of upload wizard) ── */}
      {uploadStep === 1 && (<>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.fieldLabel}>Upload Worksheet</Text>
        {docFiles.length > 0 && <Text style={{ fontSize: 11, color: colors.textDim }}>{docFiles.length} file{docFiles.length > 1 ? 's' : ''}</Text>}
      </View>

      {/* Uploaded page thumbnails */}
      {docFiles.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {docFiles.map((f, idx) => (
              <View key={idx} style={{ width: 140, borderRadius: 10, overflow: 'hidden', position: 'relative', borderWidth: 1.5, borderColor: gold + '60' }}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => f.mime.startsWith('image/') && setFullscreenImage(`data:${f.mime};base64,${f.base64}`)}>
                {f.mime.startsWith('image/') ? (
                  <Image source={{ uri: `data:${f.mime};base64,${f.base64}` }} style={{ width: 140, height: 190 }} resizeMode="contain" />
                ) : (
                  <View style={{ width: 140, height: 190, alignItems: 'center', justifyContent: 'center', backgroundColor: gold + '18' }}>
                    <Feather name="file-text" size={28} color={gold} />
                  </View>
                )}
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 3, backgroundColor: 'rgba(0,0,0,0.55)' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff', textAlign: 'center' }}>Page {idx + 1}</Text>
                </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => { setDocFiles(prev => prev.filter((_, i) => i !== idx)); if (idx === 0) setQuestions(['']); }}
                  activeOpacity={0.8}
                >
                  <Feather name="x" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Add / upload button */}
      <TouchableOpacity
        style={[styles.uploadDocBtn, { borderColor: colors.borderColor }]}
        onPress={pickDoc}
        activeOpacity={0.8}
        disabled={uploadingDoc || extractingQuestions}
      >
        {uploadingDoc ? (
          <ActivityIndicator size="small" color={colors.accentYellow} />
        ) : extractingQuestions ? (
          <ActivityIndicator size="small" color={colors.accentYellow} />
        ) : (
          <Feather name="plus-circle" size={18} color={gold} />
        )}
        <Text style={[styles.uploadDocText, { color: gold }]}>
          {uploadingDoc ? 'Uploading...' : extractingQuestions ? 'Analyzing worksheet...' : docFiles.length === 0 ? 'Upload worksheet (image, PDF or DOCX)' : 'Add another page'}
        </Text>
      </TouchableOpacity>

      {/* Auto-filled indicator */}
      {docFiles.length > 0 && !extractingQuestions && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: gold + '18', borderWidth: 1, borderColor: gold + '40' }}>
          <Feather name="cpu" size={12} color={gold} />
          <Text style={{ fontSize: 11, color: gold, fontWeight: '600' }}>Details auto-filled from worksheet — review and edit below</Text>
        </View>
      )}

      {/* Generate Interactive Quiz button moved to Output Format section below */}
      </>)}

      <AssignmentCommonFields
        showTitleDate={uploadStep === 3} showDetails={uploadStep === 1}
        createMode="upload" docFilesLength={docFiles.length}
        title={title} setTitle={setTitle} subject={subject} setSubject={setSubject}
        selectedLanguage={selectedLanguage} setSelectedLanguage={setSelectedLanguage}
        grade={grade} setGrade={setGrade} effectiveGrade={effectiveGrade} gradeOptions={gradeOptions} isIBPYP={isIBPYP}
        curriculum={curriculum} setCurriculum={setCurriculum} effectiveCurriculum={effectiveCurriculum}
        curriculumOptions={curriculumOptions} teacherCurriculum={teacherCurriculum}
        chapter={chapter} setChapter={setChapter} topicsLoading={topicsLoading} availableTopics={availableTopics}
        dueDate={dueDate} setDueDate={setDueDate}
        colors={colors} gold={gold} styles={styles}
      />

      {/* ── Generate Interactive Quiz (Step 2 of upload wizard) ── */}
      {uploadStep === 2 && docFiles.length > 0 && !extractingQuestions && (
        <View style={{ gap: 12 }}>
          {/* Reuse saved quiz */}
          {!interactiveQuiz && !generatingInteractiveQuiz && (
            <TouchableOpacity
              style={{ padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.textDim + '40', backgroundColor: 'transparent', flexDirection: 'row', alignItems: 'center', gap: 10 }}
              onPress={async () => {
                setLoadingSavedQuizzes(true);
                setShowReuseQuizModal(true);
                try {
                  const params = new URLSearchParams();
                  if (subject) params.set('subject', subject);
                  if (grade) params.set('grade', grade);
                  if (teacherEmail) params.set('teacherId', teacherEmail);
                  const res = await fetch(`${SERVER_URL}/quiz/list?${params.toString()}`);
                  const d = await res.json();
                  setSavedQuizzes(d.quizzes || []);
                } catch { setSavedQuizzes([]); }
                setLoadingSavedQuizzes(false);
              }}
              activeOpacity={0.8}
            >
              <Feather name="copy" size={18} color={colors.textDim} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textDim }}>Reuse a saved quiz</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={{ padding: 16, borderRadius: 14, borderWidth: 1.5,
              borderColor: interactiveQuiz ? colors.accentGreen + '60' : gold + '60',
              backgroundColor: interactiveQuiz ? colors.accentGreen + '10' : gold + '18',
              flexDirection: 'row', alignItems: 'center', gap: 12 }}
            onPress={generateInteractiveQuiz}
            activeOpacity={0.8}
            disabled={generatingInteractiveQuiz}
          >
            {generatingInteractiveQuiz ? (
              <ActivityIndicator size="small" color={colors.accentYellow} />
            ) : interactiveQuiz ? (
              <Feather name="check-circle" size={22} color={colors.accentGreen} />
            ) : (
              <Feather name="play-circle" size={22} color={gold} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: interactiveQuiz ? colors.accentGreen : gold }}>
                {generatingInteractiveQuiz ? 'Generating Interactive Quiz...' : interactiveQuiz ? 'Interactive Quiz Ready' : 'Generate Interactive Quiz'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>
                {generatingInteractiveQuiz ? 'AI is analyzing your worksheet...' : interactiveQuiz ? `${interactiveQuiz.tasks?.reduce((s: number, t: any) => s + (t.questions?.length || 0), 0) || 0} questions generated` : 'AI creates quiz with answers, hints & solutions from your worksheet'}
              </Text>
            </View>
            {!generatingInteractiveQuiz && (
              <Feather name={interactiveQuiz ? 'external-link' : 'chevron-right'} size={18} color={interactiveQuiz ? colors.accentGreen : gold} />
            )}
          </TouchableOpacity>

          {/* Preview button when quiz is ready */}
          {interactiveQuiz && !generatingInteractiveQuiz && (
            <View style={{ gap: 10 }}>
              {/* Teacher Preview - in-app editable answers/hints/solutions */}
              <TouchableOpacity
                style={{ padding: 14, borderRadius: 12, backgroundColor: gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onPress={() => setShowInteractivePreview(true)}
                activeOpacity={0.8}
              >
                <Feather name="edit-3" size={16} color="#0F0F0F" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F0F0F' }}>Edit & Review Quiz</Text>
              </TouchableOpacity>
              {/* Student Preview - full interactive HTML quiz */}
              <TouchableOpacity
                style={{ padding: 14, borderRadius: 12, backgroundColor: gold + '18', borderWidth: 1.5, borderColor: gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onPress={async () => {
                  try {
                    const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/quiz/render-preview`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ quiz: interactiveQuiz }),
                    });
                    const html = await res.text();
                    setStudentPreviewHtml(html);
                  } catch {
                    const htmlContent = generateQuizHTMLPreview(interactiveQuiz);
                    setStudentPreviewHtml(htmlContent);
                  }
                }}
                activeOpacity={0.8}
              >
                <Feather name="eye" size={16} color={gold} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: gold }}>Student Preview</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── Assign to (Step 3) ── */}
      {uploadStep === 3 && (
        <AssignToPicker
          assignTo={assignTo} setAssignTo={setAssignTo}
          selectedStudent={selectedStudent} setSelectedStudent={setSelectedStudent}
          studentSearch={studentSearch} setStudentSearch={setStudentSearch}
          students={students} studentsLoaded={studentsLoaded}
          teacherCurriculum={teacherCurriculum} grade={grade} setGrade={setGrade} setCurriculum={setCurriculum}
          colors={colors} gold={gold} styles={styles}
        />
      )}

      {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
    </>
  );
}
