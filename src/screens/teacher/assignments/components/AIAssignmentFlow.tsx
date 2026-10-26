import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { StepType, TaskStep, StudentItem } from '../types';
import { STEP_ICONS, STEP_COLORS, subjectLabel } from '../constants';
import TransliterationInput, { langNameToCode } from '../../../../components/common/TransliterationInput';
import { AssignmentCommonFields } from './AssignmentCommonFields';
import { StepListEditor } from './StepListEditor';
import { findIncompleteTaskStep } from '../utils/validation';
import { AssignToPicker } from './AssignToPicker';

const SECTION_STEP_TYPES: StepType[] = ['structured_writing', 'reading_comprehension', 'research_notes', 'language_practice', 'tech_skill_practice', 'skill_practice'];
const REFLECTION_STEP_TYPES: StepType[] = ['math_reflection', 'writing_reflection', 'social_synthesis', 'communication', 'artistic_reflection', 'digital_citizenship', 'physical_reflection'];

// The AI / IB PYP Assignment flow — AssignmentTypeSelector (assignment vs
// quiz), AssignmentDetails (shared common fields), and GenerationSection
// (quiz generator OR IB/curriculum generator + task steps), followed by
// success criteria, assign-to, and the Preview button — extracted verbatim
// (no behavior change) from TeacherAssignmentsScreen.tsx, as part of
// splitting the Create Assignment Modal wizard into per-flow components
// (2026-08-25), following the design the user specified.
export function AIAssignmentFlow(props: {
  type: 'assignment' | 'quiz';
  setType: (t: 'assignment' | 'quiz') => void;
  curriculum: string;
  isIBPYP: boolean;
  createMode: 'choose' | 'ai' | 'upload' | 'bulk';
  docFilesLength: number;
  title: string; setTitle: (v: string) => void;
  subject: string; setSubject: (v: string) => void;
  selectedLanguage: string; setSelectedLanguage: (v: string) => void;
  grade: string; setGrade: (v: string) => void;
  effectiveGrade: string; gradeOptions: string[];
  setCurriculum: (v: string) => void;
  effectiveCurriculum: string; curriculumOptions: string[]; teacherCurriculum: string;
  chapter: string; setChapter: (v: string) => void;
  topicsLoading: boolean; availableTopics: string[];
  dueDate: string; setDueDate: (v: string) => void;
  quizType: 'mcq' | 'fill_blank' | 'mixed'; setQuizType: (v: 'mcq' | 'fill_blank' | 'mixed') => void;
  quizDifficulty: 'easy' | 'medium' | 'hard'; setQuizDifficulty: (v: 'easy' | 'medium' | 'hard') => void;
  quizCount: number; setQuizCount: (v: number) => void;
  formError: string; setFormError: (v: string) => void;
  generatingQuiz: boolean; generateQuiz: () => void;
  unitOfInquiry: string; setUnitOfInquiry: (v: string) => void;
  generatingIB: boolean; generatingSteps: boolean;
  generateIBAssignment: () => void; generateSteps: () => void; stepsError: string;
  ibPurpose: string; setIbPurpose: (v: string) => void;
  ibCentralIdea: string; setIbCentralIdea: (v: string) => void;
  ibLinesOfInquiry: string[];
  ibLearnerProfile: string; ibAtlSkill: string; ibKeyConcept: string;
  ibLearningOutcomes: string[]; setIbLearningOutcomes: React.Dispatch<React.SetStateAction<string[]>>;
  ibWordBank: string[]; setIbWordBank: React.Dispatch<React.SetStateAction<string[]>>;
  ibStamps: string[]; setIbStamps: React.Dispatch<React.SetStateAction<string[]>>;
  taskSteps: TaskStep[];
  addTaskStep: (t: StepType) => void;
  updateTaskStep: (id: string, patch: Partial<TaskStep>) => void;
  removeTaskStep: (id: string) => void;
  fillStepWithAI: (id: string) => void;
  fillingStepId: string | null;
  questions: string[]; setQuestions: React.Dispatch<React.SetStateAction<string[]>>;
  quizQuestions: any[]; setQuizQuestions: React.Dispatch<React.SetStateAction<any[]>>;
  successCriteria: string[]; setSuccessCriteria: React.Dispatch<React.SetStateAction<string[]>>;
  note: string; setNote: (v: string) => void;
  assignTo: 'all' | 'specific'; setAssignTo: (v: 'all' | 'specific') => void;
  selectedStudent: StudentItem | null; setSelectedStudent: (s: StudentItem | null) => void;
  studentSearch: string; setStudentSearch: (v: string) => void;
  students: StudentItem[]; studentsLoaded: boolean;
  setShowPreview: (v: boolean) => void;
  colors: AppColors; gold: string; styles: any;
}) {
  const [showStepPicker, setShowStepPicker] = React.useState(false);
  const {
    type, setType, curriculum, isIBPYP,
    createMode, docFilesLength, title, setTitle, subject, setSubject, selectedLanguage, setSelectedLanguage,
    grade, setGrade, effectiveGrade, gradeOptions, setCurriculum, effectiveCurriculum, curriculumOptions, teacherCurriculum,
    chapter, setChapter, topicsLoading, availableTopics, dueDate, setDueDate,
    quizType, setQuizType, quizDifficulty, setQuizDifficulty, quizCount, setQuizCount,
    formError, setFormError, generatingQuiz, generateQuiz,
    unitOfInquiry, setUnitOfInquiry, generatingIB, generatingSteps, generateIBAssignment, generateSteps, stepsError,
    ibPurpose, setIbPurpose, ibCentralIdea, setIbCentralIdea, ibLinesOfInquiry,
    ibLearnerProfile, ibAtlSkill, ibKeyConcept, ibLearningOutcomes, setIbLearningOutcomes,
    ibWordBank, setIbWordBank, ibStamps, setIbStamps,
    taskSteps, addTaskStep, updateTaskStep, removeTaskStep, fillStepWithAI, fillingStepId,
    questions, setQuestions, quizQuestions, setQuizQuestions,
    successCriteria, setSuccessCriteria, note, setNote,
    assignTo, setAssignTo, selectedStudent, setSelectedStudent, studentSearch, setStudentSearch,
    students, studentsLoaded, setShowPreview, colors, gold, styles,
  } = props;

  return (
    <>
      {/* ── Assignment / Quiz type switcher (AI mode only) ── */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
        {([['assignment', `${curriculum || 'IB'} Assignment`, 'layers'], ['quiz', 'Quiz / MCQ', 'check-square']] as const).map(([val, label, icon]) => (
          <TouchableOpacity key={val}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
              borderColor: type === val ? '#BAA467' : colors.borderColor,
              backgroundColor: type === val ? '#BAA46718' : 'transparent' }}
            onPress={() => setType(val)}
            activeOpacity={0.75}
          >
            <Feather name={icon as any} size={14} color={type === val ? '#BAA467' : colors.textMuted} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: type === val ? '#BAA467' : colors.textMuted }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <AssignmentCommonFields
        showTitleDate showDetails
        createMode={createMode} docFilesLength={docFilesLength}
        title={title} setTitle={setTitle} subject={subject} setSubject={setSubject}
        selectedLanguage={selectedLanguage} setSelectedLanguage={setSelectedLanguage}
        grade={grade} setGrade={setGrade} effectiveGrade={effectiveGrade} gradeOptions={gradeOptions} isIBPYP={isIBPYP}
        curriculum={curriculum} setCurriculum={setCurriculum} effectiveCurriculum={effectiveCurriculum}
        curriculumOptions={curriculumOptions} teacherCurriculum={teacherCurriculum}
        chapter={chapter} setChapter={setChapter} topicsLoading={topicsLoading} availableTopics={availableTopics}
        dueDate={dueDate} setDueDate={setDueDate}
        colors={colors} gold={gold} styles={styles}
      />

      {/* ── Quiz Generator (AI mode, type === quiz) ── */}
      {type === 'quiz' && (
        <View style={{ padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#BAA46740', backgroundColor: '#BAA46708', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="check-square" size={16} color="#BAA467" />
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#BAA467' }}>Quiz Generator</Text>
          </View>

          {/* Question Type */}
          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>Question Type</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([['mcq', 'MCQ Only', 'list'], ['fill_blank', 'Fill Blanks', 'edit-3'], ['mixed', 'Mixed', 'layers']] as const).map(([val, label, icon]) => (
                <TouchableOpacity key={val}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                    paddingVertical: 9, borderRadius: 10, borderWidth: 1.5,
                    borderColor: quizType === val ? '#BAA467' : colors.borderColor,
                    backgroundColor: quizType === val ? '#BAA46718' : 'transparent' }}
                  onPress={() => setQuizType(val)}
                  activeOpacity={0.75}
                >
                  <Feather name={icon as any} size={12} color={quizType === val ? '#BAA467' : colors.textMuted} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: quizType === val ? '#BAA467' : colors.textMuted }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Difficulty */}
          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>Difficulty</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['easy','medium','hard'] as const).map(d => (
                <TouchableOpacity key={d}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1.5,
                    borderColor: quizDifficulty === d ? '#BAA467' : colors.borderColor,
                    backgroundColor: quizDifficulty === d ? '#BAA46718' : 'transparent' }}
                  onPress={() => setQuizDifficulty(d)}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: quizDifficulty === d ? '#BAA467' : colors.textMuted, textTransform: 'capitalize' }}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Count */}
          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>Number of Questions</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[3, 5, 8, 10].map(n => (
                <TouchableOpacity key={n}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1.5,
                    borderColor: quizCount === n ? '#BAA467' : colors.borderColor,
                    backgroundColor: quizCount === n ? '#BAA46718' : 'transparent' }}
                  onPress={() => setQuizCount(n)}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: quizCount === n ? '#BAA467' : colors.textMuted }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Generate button */}
          {!!formError && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, backgroundColor: '#ef444418', borderWidth: 1, borderColor: '#ef444440' }}>
              <Feather name="alert-circle" size={13} color="#ef4444" />
              <Text style={{ flex: 1, fontSize: 12, color: '#ef4444', lineHeight: 17 }}>{formError}</Text>
            </View>
          )}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: 14, borderRadius: 12, backgroundColor: generatingQuiz ? colors.borderColor : '#BAA467' }}
            onPress={generateQuiz}
            activeOpacity={0.85}
            disabled={generatingQuiz}
          >
            {generatingQuiz
              ? <ActivityIndicator size="small" color="#fff" />
              : <Feather name="cpu" size={16} color="#fff" />}
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>
              {generatingQuiz ? 'Generating Quiz...' : `Generate ${quizType === 'mcq' ? 'MCQ' : quizType === 'fill_blank' ? 'Fill-in-the-Blank' : 'Mixed'} Quiz`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── AI Assignment Generator (only in AI mode, type === assignment) ── */}
      {type === 'assignment' && <View style={{ padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#BAA46740', backgroundColor: '#BAA46708', gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="cpu" size={16} color="#BAA467" />
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#BAA467' }}>
            {isIBPYP ? 'Generate IB PYP Assignment' : `Generate ${curriculum || 'AI'} Assignment`}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: colors.textDim, lineHeight: 17 }}>
          {/* Non-IB boards call generate-steps, which returns task steps only. */}
          {isIBPYP
            ? 'AI will generate a complete IB PYP-style assignment with Purpose, Learning Outcomes, Task Steps, Success Criteria, Word Bank, and Stamps'
            : `AI will generate ${curriculum || 'curriculum'}-aligned questions for your Chapter / Topic`} — tailored to <Text style={{ fontWeight: '700' }}>{grade} · {subjectLabel(subject, curriculum, grade)}</Text>.
        </Text>

        {/* Non-IB generation uses the Chapter / Topic field above, so no second box. */}
        {isIBPYP && (
          <>
            <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>Unit of Inquiry (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. How We Organise Ourselves / Sharing the Planet"
              placeholderTextColor={colors.textDim}
              value={unitOfInquiry}
              onChangeText={setUnitOfInquiry}
            />
          </>
        )}

        {!!formError && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, backgroundColor: '#ef444418', borderWidth: 1, borderColor: '#ef444440' }}>
            <Feather name="alert-circle" size={13} color="#ef4444" />
            <Text style={{ flex: 1, fontSize: 12, color: '#ef4444', lineHeight: 17 }}>{formError}</Text>
          </View>
        )}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: 14, borderRadius: 12, backgroundColor: (generatingIB || generatingSteps) ? colors.borderColor : '#BAA467' }}
          // Bug fix: this button previously always called
          // generateIBAssignment() (→ /assignments/generate-ibpyp)
          // regardless of curriculum, even though its own label reads
          // "Generate {curriculum} Assignment" for non-IB teachers.
          // generateSteps() (→ the curriculum-correct
          // /assignments/generate-steps) was fully implemented but had
          // no caller anywhere. Route by isIBPYP so the endpoint
          // actually matches the curriculum shown on screen.
          onPress={isIBPYP ? generateIBAssignment : generateSteps}
          activeOpacity={0.85}
          disabled={generatingIB || generatingSteps}
        >
          {(generatingIB || generatingSteps)
            ? <ActivityIndicator size="small" color="#fff" />
            : <Feather name="cpu" size={16} color="#fff" />}
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>
            {(generatingIB || generatingSteps)
              ? 'Generating Assignment...'
              : isIBPYP ? 'Generate Full IB PYP Assignment' : `Generate ${curriculum || 'AI'} Assignment`}
          </Text>
        </TouchableOpacity>
        {!!stepsError && !isIBPYP && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, backgroundColor: '#ef444418', borderWidth: 1, borderColor: '#ef444440' }}>
            <Feather name="alert-circle" size={13} color="#ef4444" />
            <Text style={{ flex: 1, fontSize: 12, color: '#ef4444', lineHeight: 17 }}>{stepsError}</Text>
          </View>
        )}

        {/* Generated IB fields preview */}
        {!!ibPurpose && (
          <View style={{ gap: 8, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="check-circle" size={14} color="#BAA467" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#BAA467' }}>
                {isIBPYP ? 'IB PYP Assignment Generated' : `${curriculum || 'AI'} Assignment Generated`}
              </Text>
            </View>

            <View style={{ backgroundColor: colors.bgDark, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BAA46730' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#BAA467', marginBottom: 4 }}>PURPOSE / CENTRAL IDEA</Text>
              <TextInput
                style={{ fontSize: 12, color: colors.textMain, lineHeight: 18 }}
                value={ibCentralIdea || ibPurpose}
                onChangeText={v => { setIbCentralIdea(v); setIbPurpose(v); }}
                multiline
              />
            </View>

            {ibLinesOfInquiry.length > 0 && (
              <View style={{ backgroundColor: colors.bgDark, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BAA46730' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#BAA467', marginBottom: 6 }}>LINES OF INQUIRY</Text>
                {ibLinesOfInquiry.map((loi, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#BAA467', marginTop: 7, flexShrink: 0 }} />
                    <Text style={{ flex: 1, fontSize: 12, color: colors.textMain, lineHeight: 18 }}>{loi}</Text>
                  </View>
                ))}
              </View>
            )}

            {(ibLearnerProfile || ibAtlSkill || ibKeyConcept) && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {ibLearnerProfile ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#EFD1D418', borderWidth: 1, borderColor: '#EFD1D450' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#8C5A49' }}>Learner Profile</Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMain }}>{ibLearnerProfile}</Text>
                  </View>
                ) : null}
                {ibAtlSkill ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#BAA46718', borderWidth: 1, borderColor: '#BAA46750' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#8A7E4A' }}>ATL Skill</Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMain }}>{ibAtlSkill}</Text>
                  </View>
                ) : null}
                {ibKeyConcept ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#BAA46718', borderWidth: 1, borderColor: '#BAA46750' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#BAA467' }}>Key Concept</Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMain }}>{ibKeyConcept}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {ibLearningOutcomes.filter(l => l.trim()).length > 0 && (
              <View style={{ backgroundColor: colors.bgDark, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BAA46730' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#BAA467', marginBottom: 6 }}>LEARNING OUTCOMES</Text>
                {ibLearningOutcomes.map((lo, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#BAA467', marginTop: 7, flexShrink: 0 }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 12, color: colors.textMain, lineHeight: 18 }}
                      value={lo}
                      onChangeText={t => setIbLearningOutcomes(prev => prev.map((x, j) => j === i ? t : x))}
                      multiline
                    />
                    <TouchableOpacity onPress={() => setIbLearningOutcomes(prev => prev.filter((_, j) => j !== i))} activeOpacity={0.7}>
                      <Feather name="x" size={12} color={colors.textDim} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity onPress={() => setIbLearningOutcomes(prev => [...prev, ''])} activeOpacity={0.75}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Feather name="plus-circle" size={12} color="#BAA467" />
                  <Text style={{ fontSize: 11, color: '#BAA467', fontWeight: '600' }}>Add outcome</Text>
                </TouchableOpacity>
              </View>
            )}

            {ibWordBank.length > 0 && (
              <View style={{ backgroundColor: colors.bgDark, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BAA46730' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#BAA467', marginBottom: 6 }}>WORD BANK</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {ibWordBank.map((w, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: '#BAA46718', borderWidth: 1, borderColor: '#BAA46740' }}>
                      <Text style={{ fontSize: 12, color: '#BAA467', fontWeight: '600' }}>{w}</Text>
                      <TouchableOpacity onPress={() => setIbWordBank(prev => prev.filter((_, j) => j !== i))} activeOpacity={0.7}>
                        <Feather name="x" size={10} color="#BAA467" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TextInput
                    style={{ fontSize: 12, color: colors.textMain, minWidth: 80, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.bgDark }}
                    placeholder="Add word..."
                    placeholderTextColor={colors.textDim}
                    returnKeyType="done"
                    onSubmitEditing={(e) => {
                      const w = e.nativeEvent.text.trim();
                      if (w) setIbWordBank(prev => [...prev, w]);
                    }}
                  />
                </View>
              </View>
            )}

            {ibStamps.length > 0 && (
              <View style={{ backgroundColor: colors.bgDark, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BAA46730' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#BAA467', marginBottom: 6 }}>STAMPS / BADGES</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {ibStamps.map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: '#8A835818', borderWidth: 1, borderColor: '#8A835840' }}>
                      <Feather name="award" size={11} color="#8A8358" />
                      <Text style={{ fontSize: 12, color: '#8A8358', fontWeight: '600' }}>{s}</Text>
                      <TouchableOpacity onPress={() => setIbStamps(prev => prev.filter((_, j) => j !== i))} activeOpacity={0.7}>
                        <Feather name="x" size={10} color="#8A8358" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>}

      {/* ── Task Steps label (AI mode, assignment type only) ── */}
      {type === 'assignment' && taskSteps.length > 0 && (
        <Text style={styles.fieldLabel}>Questions</Text>
      )}

      {/* Add a step manually — any type the student app supports (no per-subject template) */}
      {type === 'assignment' && (() => {
        const typeLabels: Record<StepType, string> = {
          brainstorm: 'Brainstorm', drawing: 'Drawing', structured_writing: 'Writing',
          problem_solving: 'Problems', tuning_in: 'Tuning In',
          math_reflection: 'Math Reflection', prior_knowledge: 'Prior Knowledge',
          text_connection: 'Text Connection', reading_comprehension: 'Reading',
          writing_reflection: 'Writing Reflection', language_culture: 'Lang & Culture',
          language_practice: 'Language Practice', communication: 'Communication',
          social_inquiry: 'Social Inquiry', research_notes: 'Research Notes',
          social_synthesis: 'Social Synthesis', artistic_exploration: 'Art Explore',
          art_creation: 'Art Creation', artistic_reflection: 'Artist Statement',
          digital_awareness: 'Digital Awareness', tech_skill_practice: 'Tech Practice',
          digital_citizenship: 'Digital Citizenship', movement_exploration: 'Movement',
          skill_practice: 'Skill Practice', physical_reflection: 'PE Reflection',
        };
        const pickerTypes = (Object.keys(typeLabels) as StepType[])
          .filter(t => !(subject === 'Language Acquisition' && (t === 'drawing' || t === 'art_creation')));
        return (
      <View style={{ gap: 8 }}>
        <TouchableOpacity
          testID="add-step-toggle"
          onPress={() => setShowStepPicker(v => !v)}
          activeOpacity={0.75}
          style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: gold + '80' }}
        >
          <Feather name={showStepPicker ? 'chevron-up' : 'plus'} size={13} color={gold} />
          <Text style={{ fontSize: 12, color: gold, fontWeight: '600' }}>Add a question</Text>
        </TouchableOpacity>
        {showStepPicker && (<>
          <Text style={{ fontSize: 11, color: colors.textDim, fontWeight: '600' }}>Choose a question type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {pickerTypes.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => { addTaskStep(t); setShowStepPicker(false); }}
                activeOpacity={0.75}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: STEP_COLORS[t] + '60', backgroundColor: STEP_COLORS[t] + '12' }}
              >
                <Feather name={STEP_ICONS[t] as any} size={13} color={STEP_COLORS[t]} />
                <Text style={{ fontSize: 12, color: STEP_COLORS[t], fontWeight: '600' }}>{typeLabels[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>)}
      </View>
        );
      })()}

      {/* Existing steps */}
      {type === 'assignment' && taskSteps.map((step, idx) => (
        <View key={step.id} style={{ borderWidth: 1, borderColor: STEP_COLORS[step.type] + '40', borderRadius: 12, padding: 12, gap: 8, backgroundColor: STEP_COLORS[step.type] + '06' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: STEP_COLORS[step.type], alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>Q{idx + 1}</Text>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name={STEP_ICONS[step.type] as any} size={13} color={STEP_COLORS[step.type]} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: STEP_COLORS[step.type], textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {({
                  brainstorm: 'Brainstorm', drawing: 'Drawing', structured_writing: 'Structured Writing',
                  problem_solving: 'Practice Problems', tuning_in: 'Tuning In',
                  math_reflection: 'Math Reflection', prior_knowledge: 'Prior Knowledge',
                  text_connection: 'Text Connection', reading_comprehension: 'Reading Comprehension',
                  writing_reflection: 'Writing Reflection', language_culture: 'Language & Culture',
                  language_practice: 'Language Practice', communication: 'Communication',
                  social_inquiry: 'Social Inquiry', research_notes: 'Research Notes',
                  social_synthesis: 'Social Synthesis', artistic_exploration: 'Art Exploration',
                  art_creation: 'Art Creation', artistic_reflection: 'Artist Statement',
                  digital_awareness: 'Digital Awareness', tech_skill_practice: 'Tech Practice',
                  digital_citizenship: 'Digital Citizenship', movement_exploration: 'Movement',
                  skill_practice: 'Skill Practice', physical_reflection: 'PE Reflection',
                } as Record<StepType, string>)[step.type] || step.type}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                testID={`fill-step-${step.id}`}
                onPress={() => fillStepWithAI(step.id)}
                disabled={fillingStepId !== null}
                activeOpacity={0.75}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: gold + '70', opacity: fillingStepId && fillingStepId !== step.id ? 0.5 : 1 }}
              >
                {fillingStepId === step.id
                  ? <ActivityIndicator size="small" color={gold} />
                  : <Feather name="zap" size={12} color={gold} />}
                <Text style={{ fontSize: 11, fontWeight: '700', color: gold }}>{fillingStepId === step.id ? 'Writing…' : 'Fill with AI'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeTaskStep(step.id)} activeOpacity={0.7}>
                <Feather name="x" size={16} color={colors.accentRed} />
              </TouchableOpacity>
            </View>
          </View>

          <TextInput
            style={[styles.input, { borderColor: STEP_COLORS[step.type] + '40' }]}
            placeholder="Question title, e.g. Draw the air flow around a wing"
            placeholderTextColor={colors.textDim}
            value={step.label}
            onChangeText={t => updateTaskStep(step.id, { label: t })}
          />
          {step.provocation !== undefined && (
            <>
              <Text style={{ fontSize: 11, color: colors.textDim, fontWeight: '600' }}>{step.type === 'reading_comprehension' ? 'Reading passage (students read this)' : 'Scenario / Provocation'}</Text>
              <TransliterationInput
                style={[styles.input, styles.inputMulti, { borderColor: STEP_COLORS[step.type] + '60', minHeight: 72 }]}
                placeholder="Write the scenario or provocation text the student will read..."
                placeholderTextColor={colors.textDim}
                colors={colors}
                value={step.provocation}
                onChangeText={t => updateTaskStep(step.id, { provocation: t })}
                multiline
                langCode={subject === 'Language Acquisition' ? langNameToCode(selectedLanguage) : null}
              />
            </>
          )}
          <TransliterationInput
            style={[styles.input, styles.inputMulti, { borderColor: STEP_COLORS[step.type] + '40' }]}
            placeholder="Exactly what the student should do — or tap Fill with AI to write it from the title"
            placeholderTextColor={colors.textDim}
            colors={colors}
            value={step.instructions}
            onChangeText={t => updateTaskStep(step.id, { instructions: t })}
            multiline
            langCode={subject === 'Language Acquisition' ? langNameToCode(selectedLanguage) : null}
          />

          {step.type === 'problem_solving' && (
            <StepListEditor
              testID={`step-problems-${step.id}`}
              title="Problems" items={step.problems || []}
              onChange={next => updateTaskStep(step.id, { problems: next })}
              placeholder="Write a problem with all the numbers it needs..." addLabel="+ Problem"
              color={STEP_COLORS[step.type]} colors={colors} styles={styles}
            />
          )}

          {REFLECTION_STEP_TYPES.includes(step.type) && (
            <StepListEditor
              testID={`step-prompts-${step.id}`}
              title="Reflection questions" items={step.reflectionPrompts || []}
              onChange={next => updateTaskStep(step.id, { reflectionPrompts: next })}
              placeholder="Question the student answers..." addLabel="+ Question"
              color={STEP_COLORS[step.type]} colors={colors} styles={styles}
            />
          )}

          {SECTION_STEP_TYPES.includes(step.type) && (
            <>
              <Text style={{ fontSize: 11, color: colors.textDim, fontWeight: '600' }}>Sections (one answer box each)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {step.sections.map((sec, si) => (
                  <View key={si} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: STEP_COLORS[step.type] + '18', borderWidth: 1, borderColor: STEP_COLORS[step.type] + '40' }}>
                    <Text style={{ fontSize: 12, color: STEP_COLORS[step.type], fontWeight: '600' }}>{sec}</Text>
                    <TouchableOpacity onPress={() => updateTaskStep(step.id, { sections: step.sections.filter((_, j) => j !== si) })} activeOpacity={0.7}>
                      <Feather name="x" size={10} color={STEP_COLORS[step.type]} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  onPress={() => {
                    const name = `Section ${step.sections.length + 1}`;
                    updateTaskStep(step.id, { sections: [...step.sections, name] });
                  }}
                  activeOpacity={0.75}
                  style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: STEP_COLORS[step.type] + '40', borderStyle: 'dashed' }}
                >
                  <Text style={{ fontSize: 11, color: STEP_COLORS[step.type] }}>+ Section</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 11, color: colors.textDim, fontWeight: '600', marginTop: 4 }}>Word Bank</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {step.wordBank.map((w, wi) => (
                  <View key={wi} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: colors.borderColor }}>
                    <Text style={{ fontSize: 12, color: colors.textMain, fontWeight: '600' }}>{w}</Text>
                    <TouchableOpacity onPress={() => updateTaskStep(step.id, { wordBank: step.wordBank.filter((_, j) => j !== wi) })} activeOpacity={0.7}>
                      <Feather name="x" size={10} color={colors.textDim} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TextInput
                  style={{ fontSize: 12, color: colors.textMain, minWidth: 80, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.bgDark }}
                  placeholder="Add word..."
                  placeholderTextColor={colors.textDim}
                  returnKeyType="done"
                  onSubmitEditing={(e) => {
                    const w = e.nativeEvent.text.trim();
                    if (w) updateTaskStep(step.id, { wordBank: [...step.wordBank, w] });
                  }}
                />
              </View>
            </>
          )}
        </View>
      ))}

      {/* Quiz Questions — editable with options + correct answer (quiz mode) */}
      {type === 'quiz' && quizQuestions.length > 0 && (<>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.fieldLabel}>Quiz Questions ({quizQuestions.length})</Text>
      </View>
      {quizQuestions.map((q, i) => (
        <View key={q.id || i} style={{ padding: 12, borderRadius: 12, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor, gap: 8 }}>
          {/* Question text */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#BAA467', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>{i + 1}</Text>
            </View>
            <TextInput
              style={[styles.input, { flex: 1, fontSize: 13, marginBottom: 0 }]}
              value={q.question}
              onChangeText={(t) => setQuizQuestions(prev => prev.map((qq, j) => j === i ? { ...qq, question: t } : qq))}
              multiline
              placeholder="Question text..."
              placeholderTextColor={colors.textDim}
            />
            <TouchableOpacity onPress={() => setQuizQuestions(prev => prev.filter((_, j) => j !== i))} activeOpacity={0.7}>
              <Feather name="trash-2" size={14} color={colors.accentRed} />
            </TouchableOpacity>
          </View>
          {/* MCQ options */}
          {q.type !== 'fill_blank' && q.options?.map((opt: string, oi: number) => (
            <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 32 }}>
              <TouchableOpacity
                onPress={() => setQuizQuestions(prev => prev.map((qq, j) => j === i ? { ...qq, correct: oi } : qq))}
                style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
                  borderColor: oi === q.correct ? colors.accentGreen : colors.borderColor,
                  backgroundColor: oi === q.correct ? colors.accentGreen + '20' : 'transparent',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: oi === q.correct ? colors.accentGreen : colors.textDim }}>
                  {String.fromCharCode(65 + oi)}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { flex: 1, fontSize: 12, paddingVertical: 6, marginBottom: 0,
                  borderColor: oi === q.correct ? colors.accentGreen + '60' : colors.borderColor }]}
                value={opt}
                onChangeText={(t) => setQuizQuestions(prev => prev.map((qq, j) => {
                  if (j !== i) return qq;
                  const newOpts = [...(qq.options || [])];
                  newOpts[oi] = t;
                  return { ...qq, options: newOpts };
                }))}
                placeholder={`Option ${String.fromCharCode(65 + oi)}...`}
                placeholderTextColor={colors.textDim}
              />
              {oi === q.correct && <Feather name="check-circle" size={14} color={colors.accentGreen} />}
            </View>
          ))}
          {/* Fill blank answer */}
          {q.type === 'fill_blank' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 32 }}>
              <Feather name="check-circle" size={13} color={colors.accentGreen} />
              <Text style={{ fontSize: 11, color: colors.accentGreen, fontWeight: '700' }}>Answer:</Text>
              <TextInput
                style={[styles.input, { flex: 1, fontSize: 12, paddingVertical: 6, marginBottom: 0, borderColor: colors.accentGreen + '50' }]}
                value={String(q.correct || '')}
                onChangeText={(t) => setQuizQuestions(prev => prev.map((qq, j) => j === i ? { ...qq, correct: t } : qq))}
                placeholder="Correct answer..."
                placeholderTextColor={colors.textDim}
              />
            </View>
          )}
        </View>
      ))}
      </>)}

      {/* ── Success Criteria (AI mode) ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Success Criteria</Text>
          <Text style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>
            If visible in the worksheet, AI will auto-detect. Add here if not on worksheet.
          </Text>
        </View>
        {successCriteria.length < 10 && (
          <TouchableOpacity
            onPress={() => setSuccessCriteria(prev => [...prev, ''])}
            activeOpacity={0.75}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 }}
          >
            <Feather name="plus-circle" size={14} color={gold} />
            <Text style={{ fontSize: 12, color: gold, fontWeight: '600' }}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
      {successCriteria.map((c, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: gold + '60', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="check" size={11} color={gold} />
          </View>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder={`e.g. Wrote a clear paragraph with beginning, middle, end`}
            placeholderTextColor={colors.textDim}
            value={c}
            onChangeText={(t) => setSuccessCriteria(prev => prev.map((x, j) => j === i ? t : x))}
          />
          {successCriteria.length > 1 && (
            <TouchableOpacity onPress={() => setSuccessCriteria(prev => prev.filter((_, j) => j !== i))} activeOpacity={0.75}>
              <Feather name="trash-2" size={16} color={colors.accentRed} />
            </TouchableOpacity>
          )}
        </View>
      ))}

      <Text style={styles.fieldLabel}>Note (optional)</Text>
      <TextInput
        style={[styles.input, styles.inputMulti]}
        placeholder="Additional instructions for students..."
        placeholderTextColor={colors.textDim}
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={3}
      />

      <AssignToPicker
        assignTo={assignTo} setAssignTo={setAssignTo}
        selectedStudent={selectedStudent} setSelectedStudent={setSelectedStudent}
        studentSearch={studentSearch} setStudentSearch={setStudentSearch}
        students={students} studentsLoaded={studentsLoaded}
        teacherCurriculum={teacherCurriculum} grade={grade} setGrade={setGrade} setCurriculum={setCurriculum}
        colors={colors} gold={gold} styles={styles}
      />

      {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

      {/* Preview button (AI mode only — upload mode uses footer) */}
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.accentCyan }]}
        onPress={() => {
          if (!title.trim()) { setFormError('Title is required'); return; }
          if (!dueDate.trim()) { setFormError('Due date is required'); return; }
          if (type === 'quiz' && quizQuestions.length === 0) { setFormError('Generate quiz questions first.'); return; }
          const incomplete = type === 'assignment' ? findIncompleteTaskStep(taskSteps) : null;
          if (incomplete) { setFormError(incomplete); return; }
          setFormError('');
          setShowPreview(true);
        }}
        activeOpacity={0.85}
      >
        <Feather name="eye" size={15} color="#fff" />
        <Text style={styles.submitBtnText}>Preview Before Publishing</Text>
      </TouchableOpacity>
    </>
  );
}
