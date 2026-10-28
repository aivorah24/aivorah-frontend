import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { useStudentData } from '../../../../context/StudentDataContext';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';
import { makeModalStyles } from '../styles';
import { SUBJECT_COLOR, SUBJECT_ICON, STEP_COLORS, STEP_TEXT_COLORS, STEP_ICONS } from '../constants';
import { getStamp, scoreBadge, assignmentLanguageText } from '../utils';
import type { Assignment, StepType, StepAnswer, PerQ, GradeResult } from '../types';
import { ModalTopBar } from './ModalTopBar';
import { ConfirmCloseOverlay } from './ConfirmCloseOverlay';
import { PhotoUploadStep } from './PhotoUploadStep';
import TransliterationInput, { resolveTypingLang } from '../../../../components/common/TransliterationInput';

// ── Scaffolded Submission Modal ───────────────────────────────────────────────
// Flow: Step 1 (brainstorm/drawing/writing/photo) → ... → Self-Assessment → Submit → Results

export function ScaffoldedModal({ assignment, colors, onClose, onSubmitted }: {
  assignment: Assignment; colors: AppColors;
  onClose: () => void;
  onSubmitted: (updated: any) => void;
}) {
  const styles    = useMemo(() => makeModalStyles(colors), [colors]);
  const { studentId } = useStudentData();
  const steps     = assignment.taskSteps || [];
  const criteria  = assignment.successCriteria || [];
  const color     = SUBJECT_COLOR[assignment.subject] ?? '#BAA467';

  const [stepAnswers, setStepAnswers] = useState<StepAnswer[]>(() =>
    steps.map(s => ({
      stepId: s.id, type: s.type, keywords: [],
      drawingBase64: null, drawingMime: 'image/png',
      sections: (s.sections?.length ? s.sections : ['Beginning','Middle','End']).map(l => ({ label: l, text: '' })),
      problemAnswers: s.problems?.map(() => '') || [],
      tunedInText: '',
      noticeWonderKnow: { notice: '', wonder: '', know: '' },
      reflectionAnswers: s.reflectionPrompts?.map(() => '') || ['', '', ''],
      priorKnowledge: { knows: '', predicts: '' },
    }))
  );
  // -1 = worksheet overview, 0..steps.length-1 = steps, steps.length = self-assess
  const [currentStep,   setCurrentStep]   = useState(-1);
  const [selfChecked,   setSelfChecked]   = useState<Record<string, boolean>>({});
  const [keywordInput,  setKeywordInput]  = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [result,        setResult]        = useState<GradeResult | null>(null);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const focusedSectionIdx = useRef<number>(0);

  const isOverview     = currentStep === -1;
  const isSelfAssess   = currentStep === steps.length;
  const isLastDataStep = currentStep === steps.length - 1;
  const step           = steps[currentStep];
  const ans            = stepAnswers[currentStep];
  const stamp          = result ? getStamp(result.score) : null;

  function patchAns(patch: Partial<StepAnswer>) {
    setStepAnswers(prev => prev.map((a, i) => i === currentStep ? { ...a, ...patch } : a));
  }

  function addKeyword() {
    const kw = keywordInput.trim();
    if (!kw || ans.keywords.includes(kw)) return;
    patchAns({ keywords: [...ans.keywords, kw] });
    setKeywordInput('');
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // Flatten noticeWonderKnow → tunedInText for server compatibility
      const normalizedAnswers = stepAnswers.map(a => {
        if (a.noticeWonderKnow) {
          const nwk = a.noticeWonderKnow;
          const combined = [
            nwk.notice ? `I Notice: ${nwk.notice}` : '',
            nwk.wonder ? `I Wonder: ${nwk.wonder}` : '',
            nwk.know   ? `I Already Know: ${nwk.know}` : '',
          ].filter(Boolean).join('\n');
          return { ...a, tunedInText: combined };
        }
        return a;
      });
      const ctrl2 = new AbortController();
      const t2 = setTimeout(() => ctrl2.abort(), 120_000);
      const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/${assignment.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, stepAnswers: normalizedAnswers, selfAssessment: selfChecked }),
        signal: ctrl2.signal,
      }).finally(() => clearTimeout(t2));
      const data = await res.json();
      if (res.ok) {
        let feedbackText = data.aiFeedback || '';
        let stamp = ''; let wellDone = ''; let improve = ''; let pq: PerQ[] = []; let tFb = '';
        try {
          const parsed = JSON.parse(feedbackText);
          feedbackText = parsed.text || feedbackText;
          stamp = parsed.stamp || ''; wellDone = parsed.wellDone || ''; improve = parsed.improve || '';
          pq = Array.isArray(parsed.perQuestion) ? parsed.perQuestion : [];
          tFb = parsed.teacherFeedback || '';
        } catch { pq = data.perQuestion || []; }
        setResult({ score: data.score, feedback: feedbackText, stamp, wellDone, improve, perQuestion: pq, teacherFeedback: tFb });
        onSubmitted(data);
      } else {
        Alert.alert('Error', data.error || 'Submission failed');
      }
    } catch {
      Alert.alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Grading spinner ──
  if (submitting) return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { justifyContent: 'center', alignItems: 'center', paddingVertical: 80, gap: 24 }]}>
          <ActivityIndicator size="large" color={color} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textMain, textAlign: 'center', fontFamily: fonts.serif }}>AI is grading your work...</Text>
          <Text style={{ fontSize: 13, color: colors.textDim, textAlign: 'center', lineHeight: 22, paddingHorizontal: 32 }}>Reading your brainstorm, drawing, and writing.{'\n'}Takes about 20–40 seconds.</Text>
        </View>
      </View>
    </Modal>
  );

  // ── Results ──
  if (result) return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={[styles.header, { borderBottomColor: colors.borderColor }]}>
            <View style={[styles.subjectDot, { backgroundColor: color + '20' }]}>
              <Feather name="check-circle" size={18} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Your Results</Text>
              <Text style={styles.meta}>{assignment.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}><Feather name="x" size={22} color={colors.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { maxWidth: 720, alignSelf: 'center', width: '100%' }]}>
            <View style={styles.resultBox}>
              <View style={[styles.scoreBadge, { backgroundColor: color + '15', borderColor: color + '30' }]}>
                <Text style={[styles.scoreNum, { color }]}>{result.score != null ? `${result.score}%` : 'Done'}</Text>
                <Text style={[styles.scoreLabel, { color }]}>{result.score != null ? result.score >= 85 ? 'Excellent!' : result.score >= 60 ? 'Good effort!' : 'Keep going!' : 'Submitted'}</Text>
              </View>
              {stamp && (
                <View style={[styles.stampCard, { backgroundColor: stamp.color + '15', borderColor: stamp.color + '40' }]}>
                  <View style={[styles.stampIcon, { backgroundColor: stamp.color }]}>
                    <Feather name={stamp.icon as any} size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stampLabel}>You earned a stamp!</Text>
                    <Text style={[styles.stampName, { color: stamp.color }]}>{result.stamp || stamp.label}</Text>
                  </View>
                </View>
              )}
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackTitle}>Overall Feedforward</Text>
                <Text style={styles.feedbackText}>{result.feedback}</Text>
              </View>
              {result.wellDone ? (
                <View style={[styles.criteriaRow, { borderColor: colors.accentGreen + '40', backgroundColor: colors.accentGreen + '08' }]}>
                  <Feather name="check-circle" size={16} color={colors.accentGreen} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.criteriaLabel, { color: colors.accentGreen }]}>Well done</Text>
                    <Text style={[styles.criteriaText, { color: colors.textMuted }]}>{result.wellDone}</Text>
                  </View>
                </View>
              ) : null}
              {result.improve ? (
                <View style={[styles.criteriaRow, { borderColor: colors.accentYellow + '40', backgroundColor: colors.accentYellow + '08' }]}>
                  <Feather name="target" size={16} color={colors.accentYellow} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.criteriaLabel, { color: colors.accentYellow }]}>Next time, try to...</Text>
                    <Text style={[styles.criteriaText, { color: colors.textMuted }]}>{result.improve}</Text>
                  </View>
                </View>
              ) : null}
              {result.perQuestion.length > 0 && (
                <View style={{ gap: 6 }}>
                  <Text style={styles.feedbackTitle}>Question by Question · {result.perQuestion.filter((q: any) => q.answered !== false).length} of {result.perQuestion.length} answered</Text>
                  {result.perQuestion.map((q: any, idx: number) => {
                    const badge = scoreBadge(q);
                    const sc = colors[badge.colorKey];
                    const stepColor = STEP_COLORS[q.type as StepType] || color;
                    const isFullMarks = q.score >= 100;
                    return (
                      <View key={idx} style={{ borderRadius: 10, borderWidth: 1, borderColor: sc + '40', backgroundColor: colors.cardDark, overflow: 'hidden' }}>
                        {/* Header row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: sc + '0A', borderBottomWidth: q.studentAnswer || q.comment ? 1 : 0, borderBottomColor: colors.borderColor }}>
                          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: stepColor, alignItems: 'center', justifyContent: 'center' }}>
                            <Feather name={(STEP_ICONS[q.type as StepType] as any) || 'check'} size={11} color="#fff" />
                          </View>
                          <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: colors.textMain }} numberOfLines={2}>Q{idx + 1}. {q.stepLabel || q.question || 'Question'}</Text>
                          <View style={{ backgroundColor: sc + '25', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: sc }}>{badge.label}</Text>
                          </View>
                        </View>
                        {/* Body */}
                        {(q.studentAnswer || q.comment) ? (
                          <View style={{ padding: 10, gap: 6 }}>
                            {q.studentAnswer ? (
                              <View style={{ flexDirection: 'row', gap: 6 }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textDim, width: 60 }}>Your answer</Text>
                                <Text style={{ flex: 1, fontSize: 11, color: colors.textMuted, lineHeight: 16 }} numberOfLines={3}>{q.studentAnswer}</Text>
                              </View>
                            ) : null}
                            {q.comment ? (
                              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                                <Feather name="cpu" size={10} color={sc} style={{ marginTop: 2 }} />
                                <Text style={{ flex: 1, fontSize: 11, color: colors.textMain, lineHeight: 16 }}>{q.comment}</Text>
                              </View>
                            ) : null}
                            {!isFullMarks && q.answered && !q.needsReview ? (
                              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: colors.borderColor, paddingTop: 6 }}>
                                <Feather name="target" size={10} color={colors.accentYellow} style={{ marginTop: 2 }} />
                                <Text style={{ flex: 1, fontSize: 11, color: colors.accentYellow, lineHeight: 16 }}>
                                  <Text style={{ fontWeight: '700' }}>To get 100%: </Text>
                                  {q.correctAnswer ? `Include: ${q.correctAnswer}` : 'Review this step and add more detail next time.'}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
              {result.teacherFeedback ? (
                <View style={{ borderRadius: 12, padding: 14, backgroundColor: colors.accentYellow + '0E', borderWidth: 1, borderColor: colors.accentYellow + '30', gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Feather name="user" size={13} color={colors.accentYellow} />
                    <Text style={{ fontSize: 12, color: colors.accentYellow, fontWeight: '700' }}>Teacher Feedback</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: colors.textMain, lineHeight: 20 }}>{result.teacherFeedback}</Text>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={onClose} activeOpacity={0.85}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14, backgroundColor: color }}>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.submitBtnText}>Done</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ── Worksheet Overview (step -1) ── Full IB PYP standard, Aivorah pastel theme ──
  const isIBPYP = assignment.curriculum?.toLowerCase().includes('ib') ?? false;
  if (isOverview) return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={() => setShowConfirm(true)}>
      <View style={[styles.overlay, { backgroundColor: colors.bgDark }]}>
        <ModalTopBar
          title={assignment.title}
          subtitle={`${assignment.subject} · ${assignment.grade ?? ''}${isIBPYP && assignment.curriculum ? ` · ${assignment.curriculum}` : ''}`}
          color={color} colors={colors}
          icon={SUBJECT_ICON[assignment.subject] ?? 'file-text'}
          onBack={() => setShowConfirm(true)}
        />
        <ConfirmCloseOverlay visible={showConfirm} color={color} colors={colors}
          onConfirm={onClose} onCancel={() => setShowConfirm(false)} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40, maxWidth: 720, alignSelf: 'center', width: '100%' }}>

          {/* ── IB PYP Central Idea ── */}
          {assignment.note ? (
            <View style={{ borderRadius: 14, backgroundColor: color + '14', borderWidth: 1.5, borderColor: color + '35', padding: 16 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                {isIBPYP ? 'Central Idea' : 'Purpose'}
              </Text>
              <Text style={{ fontSize: 15, color: colors.textMain, lineHeight: 23, fontStyle: 'italic' }}>{assignment.note}</Text>
            </View>
          ) : null}

          {/* ── IB PYP metadata row: Learner Profile · ATL · Key Concept ── */}
          {isIBPYP && (assignment.learnerProfile || assignment.atlSkill || assignment.keyConcept) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {assignment.learnerProfile ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                  backgroundColor: '#BAA46712', borderWidth: 1, borderColor: '#BAA46750' }}>
                  <Feather name="user" size={11} color="#8A6030" />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#8A6030' }}>Learner Profile </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMain }}>{assignment.learnerProfile}</Text>
                </View>
              ) : null}
              {assignment.atlSkill ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                  backgroundColor: '#BAA46712', borderWidth: 1, borderColor: '#BAA46750' }}>
                  <Feather name="activity" size={11} color="#8A7E4A" />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#8A7E4A' }}>ATL </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMain }}>{assignment.atlSkill}</Text>
                </View>
              ) : null}
              {assignment.keyConcept ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                  backgroundColor: '#BAA46712', borderWidth: 1, borderColor: '#BAA46750' }}>
                  <Feather name="layers" size={11} color="#7A6420" />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#7A6420' }}>Key Concept </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMain }}>{assignment.keyConcept}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* ── Lines of Inquiry ── */}
          {isIBPYP && Array.isArray(assignment.linesOfInquiry) && assignment.linesOfInquiry.length > 0 && (
            <View style={{ borderRadius: 12, backgroundColor: color + '08', borderWidth: 1, borderColor: color + '25', padding: 14 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Lines of Inquiry</Text>
              {assignment.linesOfInquiry.map((loi, li) => (
                <View key={li} style={{ flexDirection: 'row', gap: 8, marginBottom: li < assignment.linesOfInquiry!.length - 1 ? 6 : 0 }}>
                  <Text style={{ fontSize: 13, color, marginTop: 2 }}>›</Text>
                  <Text style={{ flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 19 }}>{loi}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Tasks overview — worksheet-style ── */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.9 }}>
              Your Tasks ({steps.length} {steps.length === 1 ? 'Step' : 'Steps'})
            </Text>
            {steps.map((s, i) => {
              const sc = STEP_COLORS[s.type] ?? color;
              const stc = STEP_TEXT_COLORS[s.type] ?? color;
              const si = STEP_ICONS[s.type] ?? 'check';
              const STEP_LABELS: Partial<Record<StepType, string>> = {
                brainstorm: 'Brainstorm', drawing: 'Drawing', structured_writing: 'Writing',
                problem_solving: 'Practice Problems', tuning_in: 'Tuning In',
                math_reflection: 'Math Reflection', prior_knowledge: 'Prior Knowledge',
                text_connection: 'Text Connection', reading_comprehension: 'Reading',
                writing_reflection: 'Writing Reflection', language_culture: 'Language & Culture',
                language_practice: 'Language Practice', communication: 'Communication',
                social_inquiry: 'Social Inquiry', research_notes: 'Research Notes',
                social_synthesis: 'Social Synthesis', artistic_exploration: 'Art Exploration',
                art_creation: 'Art Creation', artistic_reflection: 'Artist Statement',
                digital_awareness: 'Digital Awareness', tech_skill_practice: 'Tech Practice',
                digital_citizenship: 'Digital Citizenship', movement_exploration: 'Movement',
                skill_practice: 'Skill Practice', physical_reflection: 'PE Reflection',
              };
              const typeLabel = STEP_LABELS[s.type] ?? s.type;
              return (
                <View key={i} style={{ borderRadius: 14, backgroundColor: sc + '12', borderWidth: 1.5, borderColor: sc + '35', overflow: 'hidden' }}>
                  {/* Step colour strip */}
                  <View style={{ height: 4, backgroundColor: sc }} />
                  <View style={{ flexDirection: 'row', gap: 12, padding: 14 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: sc + '30', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: stc }}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <Feather name={si as any} size={11} color={stc} />
                        <Text style={{ fontSize: 10, fontWeight: '800', color: stc, textTransform: 'uppercase', letterSpacing: 0.7 }}>{typeLabel}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMain, marginBottom: 4 }}>{s.label}</Text>
                      <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 19 }}>{s.instructions}</Text>
                      {/* Show problems preview for problem_solving */}
                      {s.type === 'problem_solving' && s.problems && s.problems.length > 0 && (
                        <View style={{ marginTop: 10, gap: 6 }}>
                          {s.problems.map((p, pi) => (
                            <View key={pi} style={{ flexDirection: 'row', gap: 8, padding: 10, borderRadius: 8, backgroundColor: sc + '15' }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: stc, minWidth: 18 }}>{pi + 1}.</Text>
                              <Text style={{ flex: 1, fontSize: 13, color: colors.textMain, lineHeight: 19 }}>{p}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* ── Word Bank ── */}
          {(() => {
            const wb = steps.find(s => s.wordBank && s.wordBank.length > 0)?.wordBank || [];
            return wb.length > 0 ? (
              <View style={{ borderRadius: 14, backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, padding: 14 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10 }}>
                  Word Bank — Use These in Your Writing
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                  {wb.map((w, wi) => (
                    <View key={wi} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                      backgroundColor: color + '18', borderWidth: 1, borderColor: color + '40' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color }}>{w}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null;
          })()}

            {/* Success Criteria */}
            {criteria.length > 0 && (
              <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Success Criteria</Text>
                {criteria.map((c, ci) => (
                  <View key={ci} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginTop: 8, flexShrink: 0 }} />
                    <Text style={{ flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 20 }}>{c}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Start button */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: color, alignSelf: 'center', minWidth: 160, maxWidth: 220 }]}
              onPress={() => setCurrentStep(0)}
              activeOpacity={0.85}
            >
              <Feather name="play" size={16} color="#fff" />
              <Text style={styles.submitBtnText}>Start Assignment</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
    </Modal>
  );

  // ── Self-Assessment ──
  if (isSelfAssess) return (
    <Modal visible animationType="slide" transparent onRequestClose={() => setCurrentStep(steps.length - 1)}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={[styles.header, { borderBottomColor: colors.borderColor }]}>
            <View style={[styles.subjectDot, { backgroundColor: color + '20' }]}>
              <Feather name="check-square" size={18} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Check Yourself</Text>
              <Text style={styles.meta}>Before you submit — how did you do?</Text>
            </View>
            <TouchableOpacity onPress={() => setCurrentStep(steps.length - 1)} activeOpacity={0.7}>
              <Feather name="chevron-left" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, alignItems: 'center' }}>
            <View style={{ width: '100%', maxWidth: 600 }}>
            <Text style={{ fontSize: 12, color: colors.textDim, lineHeight: 18, marginBottom: 10 }}>
              Read each statement and tick if you did it. Be honest — this helps you learn!
            </Text>
            {criteria.length > 0 ? criteria.map((c, i) => {
              const checked = !!selfChecked[c];
              return (
                <TouchableOpacity key={i} activeOpacity={0.75} onPress={() => setSelfChecked(prev => ({ ...prev, [c]: !prev[c] }))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9, borderRadius: 9, marginBottom: 6,
                    borderWidth: 1.5, borderColor: checked ? color + '60' : colors.borderColor,
                    backgroundColor: checked ? color + '08' : colors.bgDark }}>
                  <View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 2,
                    borderColor: checked ? color : colors.textDim,
                    backgroundColor: checked ? color : 'transparent',
                    alignItems: 'center', justifyContent: 'center' }}>
                    {checked && <Feather name="check" size={11} color="#fff" />}
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, color: colors.textMain, lineHeight: 18 }}>{c}</Text>
                </TouchableOpacity>
              );
            }) : (
              <View style={{ padding: 12, borderRadius: 10, backgroundColor: colors.borderColor, alignItems: 'center' }}>
                <Text style={{ color: colors.textDim, fontSize: 12 }}>No success criteria set for this assignment.</Text>
              </View>
            )}
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderRadius: 11, backgroundColor: color, marginTop: 14, maxWidth: 320, width: '100%', alignSelf: 'center' }} onPress={handleSubmit} activeOpacity={0.85}>
              <Feather name="send" size={14} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Submit for AI Grading</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCurrentStep(steps.length - 1)} activeOpacity={0.7} style={{ alignSelf: 'center', paddingVertical: 8 }}>
              <Text style={{ fontSize: 11, color: colors.textDim, textDecorationLine: 'underline' }}>Go back to last step</Text>
            </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ── Step UI ──
  if (!step) return null;
  const stepColor = STEP_COLORS[step.type as StepType] ?? '#BAA467';
  // Native-script assignments (Telugu, Hindi…) get English→script typing
  const langCode = resolveTypingLang(assignment.subject, step.label, step.instructions, assignmentLanguageText(assignment));
  return (
    <Modal visible animationType="slide" transparent onRequestClose={() => setShowConfirm(true)}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ModalTopBar
            title={step.label}
            subtitle={`Step ${currentStep + 1} of ${steps.length} · ${assignment.subject}`}
            color={stepColor} colors={colors}
            icon={STEP_ICONS[step.type] ?? 'file-text'}
            onBack={() => currentStep === 0 ? setShowConfirm(true) : setCurrentStep(i => i - 1)}
          />
          <ConfirmCloseOverlay visible={showConfirm} color={color} colors={colors}
            onConfirm={onClose} onCancel={() => setShowConfirm(false)} />

          {/* Progress bar */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4, gap: 4 }}>
            {steps.map((s, i) => (
              <View key={i} style={{ flex: 1, height: 4, borderRadius: 2,
                backgroundColor: i < currentStep ? STEP_COLORS[s.type] : i === currentStep ? stepColor : colors.borderColor,
                opacity: i === currentStep ? 1 : 0.5 }} />
            ))}
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.borderColor, opacity: 0.3 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { gap: 16, maxWidth: 720, alignSelf: 'center', width: '100%' }]}>
            {/* Assignment purpose — shown once at the top of the first step */}
            {currentStep === 0 && assignment.note ? (
              <View style={{ padding: 12, borderRadius: 10, backgroundColor: color + '10', borderWidth: 1, borderColor: color + '30' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Purpose</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 20 }}>{assignment.note}</Text>
              </View>
            ) : null}
            {/* Instructions */}
            {step.instructions ? (
              <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10, backgroundColor: stepColor + '12', borderWidth: 1, borderColor: stepColor + '30' }}>
                <Feather name="info" size={14} color={stepColor} style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 20 }}>{step.instructions}</Text>
              </View>
            ) : null}

            {/* ── UI PATTERN ROUTING ─────────────────────────────────────────────
                Hook types  : single text input (tuning in, text connection, social inquiry, etc.)
                Section types: multiple labeled text areas (reading, research, skill practice, etc.)
                Reflection  : numbered prompts with text areas (math/writing/arts/PE reflection)
                Problems    : maths problem list with answer inputs
                Drawing     : canvas / photo upload
                Brainstorm  : keyword chips + input
            ─────────────────────────────────────────────────────────────────── */}

            {/* ── BRAINSTORM ── */}
            {step.type === 'brainstorm' && (
              <View style={{ gap: 12 }}>
                <Text style={[styles.sectionLabel, { color: stepColor }]}>Your Keywords</Text>
                {/* Existing keywords as chips */}
                {ans.keywords.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {ans.keywords.map((kw, ki) => (
                      <TouchableOpacity key={ki} activeOpacity={0.7}
                        onPress={() => patchAns({ keywords: ans.keywords.filter((_, j) => j !== ki) })}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8,
                          borderRadius: 20, backgroundColor: stepColor + '20', borderWidth: 1, borderColor: stepColor + '50' }}>
                        <Text style={{ fontSize: 14, color: stepColor, fontWeight: '700' }}>{kw}</Text>
                        <Feather name="x" size={11} color={stepColor} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {/* Input */}
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                  <TransliterationInput langCode={langCode} colors={colors}
                    style={[styles.content, { borderWidth: 1.5, borderColor: stepColor + '60', borderRadius: 12,
                      paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textMain, backgroundColor: colors.bgDark }]}
                    placeholder="Type a keyword and press Add..."
                    placeholderTextColor={colors.textDim}
                    value={keywordInput}
                    onChangeText={setKeywordInput}
                    onSubmitEditing={addKeyword}
                    returnKeyType="done"
                  />
                  </View>
                  <TouchableOpacity onPress={addKeyword} activeOpacity={0.8}
                    style={{ height: 48, paddingHorizontal: 16, borderRadius: 12, backgroundColor: stepColor, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 11, color: colors.textDim, textAlign: 'center' }}>Tap a keyword to remove it</Text>
              </View>
            )}

            {/* ── DRAWING & ART CREATION — Photo upload only (canvas removed) ── */}
            {(step.type === 'drawing' || step.type === 'art_creation') && (
              <PhotoUploadStep
                stepColor={stepColor}
                colors={colors}
                drawingBase64={ans.drawingBase64}
                drawingMime={ans.drawingMime}
                isArt={step.type === 'art_creation'}
                onCapture={(b64, mime) => patchAns({ drawingBase64: b64, drawingMime: mime })}
              />
            )}

            {/* ── PROBLEM SOLVING (Maths) ── */}
            {step.type === 'problem_solving' && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionLabel, { color: stepColor }]}>Solve the Problems</Text>
                {(step.problems || []).length === 0 ? (
                  <Text style={{ fontSize: 14, color: colors.textMuted, fontStyle: 'italic' }}>No problems defined for this step.</Text>
                ) : (
                  (step.problems || []).map((problem, pi) => (
                    <View key={pi} style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12,
                        backgroundColor: stepColor + '12', borderWidth: 1.5, borderColor: stepColor + '30' }}>
                        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: stepColor,
                          alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>{pi + 1}</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 15, color: colors.textMain, lineHeight: 23, fontWeight: '500' }}>{problem}</Text>
                      </View>
                      <TransliterationInput langCode={langCode} colors={colors}
                        style={{ borderWidth: 1.5, borderColor: stepColor + '50', borderRadius: 12,
                          paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textMain,
                          backgroundColor: colors.bgDark, minHeight: 60, textAlignVertical: 'top' }}
                        placeholder={`Your answer to Problem ${pi + 1}...`}
                        placeholderTextColor={colors.textDim}
                        value={ans.problemAnswers?.[pi] ?? ''}
                        onChangeText={t => patchAns({
                          problemAnswers: (ans.problemAnswers || step.problems!.map(() => '')).map((a, j) => j === pi ? t : a)
                        })}
                        multiline
                      />
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── HOOK STEPS: All "Tuning In" style steps across subjects ──
                Covers: tuning_in, text_connection, social_inquiry, language_culture,
                        artistic_exploration, digital_awareness, movement_exploration       */}
            {(['tuning_in','text_connection','social_inquiry','language_culture','artistic_exploration','digital_awareness','movement_exploration'] as StepType[]).includes(step.type) && (
              <View style={{ gap: 14 }}>
                {step.provocation ? (
                  <View style={{ padding: 16, borderRadius: 14, backgroundColor: stepColor + '18',
                    borderWidth: 1.5, borderColor: stepColor + '40', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name={STEP_ICONS[step.type] as any} size={14} color={stepColor} />
                      <Text style={{ fontSize: 10, fontWeight: '800', color: stepColor, textTransform: 'uppercase', letterSpacing: 0.8 }}>Think About This</Text>
                    </View>
                    <Text style={{ fontSize: 15, color: colors.textMain, lineHeight: 23, fontWeight: '500', fontStyle: 'italic' }}>{step.provocation}</Text>
                  </View>
                ) : null}
                {(['social_inquiry','tuning_in','text_connection'] as StepType[]).includes(step.type) ? (
                  // Structured Notice / Wonder / Know for inquiry-based steps
                  <View style={{ gap: 12 }}>
                    <Text style={[styles.sectionLabel, { color: stepColor }]}>My Initial Thinking</Text>
                    {([
                      { key: 'notice',  label: 'I Notice', placeholder: 'What do you observe or see?' },
                      { key: 'wonder',  label: 'I Wonder', placeholder: 'What are you curious about?' },
                      { key: 'know',    label: 'I Already Know', placeholder: 'What do you already know?' },
                    ] as const).map(({ key, label, placeholder }) => (
                      <View key={key} style={{ gap: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: stepColor }}>{label}</Text>
                        <TransliterationInput langCode={langCode} colors={colors}
                          style={{ borderWidth: 1.5, borderColor: stepColor + '40', borderRadius: 10,
                            paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.textMain,
                            backgroundColor: colors.bgDark, minHeight: 52, textAlignVertical: 'top', lineHeight: 20 }}
                          placeholder={placeholder}
                          placeholderTextColor={colors.textDim}
                          value={(ans.noticeWonderKnow as any)?.[key] ?? ''}
                          onChangeText={t => patchAns({ noticeWonderKnow: { ...(ans.noticeWonderKnow || { notice: '', wonder: '', know: '' }), [key]: t } })}
                          multiline
                        />
                      </View>
                    ))}
                    <Text style={{ fontSize: 11, color: colors.textDim, textAlign: 'center' }}>Every idea matters — there are no wrong answers!</Text>
                  </View>
                ) : (
                  // Generic open text for other hook types (language_culture, artistic_exploration, etc.)
                  <View style={{ gap: 8 }}>
                    <Text style={[styles.sectionLabel, { color: stepColor }]}>My Initial Thinking</Text>
                    <TransliterationInput langCode={langCode} colors={colors}
                      style={{ borderWidth: 1.5, borderColor: stepColor + '50', borderRadius: 12,
                        padding: 14, fontSize: 15, color: colors.textMain, backgroundColor: colors.bgDark,
                        minHeight: 110, textAlignVertical: 'top', lineHeight: 24 }}
                      placeholder="Write your first thoughts here — there are no wrong answers!"
                      placeholderTextColor={colors.textDim}
                      value={ans.tunedInText ?? ''}
                      onChangeText={t => patchAns({ tunedInText: t })}
                      multiline
                    />
                    <Text style={{ fontSize: 11, color: colors.textDim, textAlign: 'center' }}>Share what you think — every idea matters!</Text>
                  </View>
                )}
              </View>
            )}

            {/* ── PRIOR KNOWLEDGE (Science Step 1) — 2-section special hook ── */}
            {step.type === 'prior_knowledge' && (
              <View style={{ gap: 14 }}>
                {[{ key: 'knows' as const, label: 'What I Already Know', icon: 'bookmark', placeholder: 'Write what you already know about this topic...' },
                  { key: 'predicts' as const, label: 'What I Predict', icon: 'help-circle', placeholder: 'Write what you think will happen or what you will discover...' }].map(({ key, label, icon, placeholder }) => (
                  <View key={key} style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name={icon as any} size={13} color={stepColor} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: stepColor }}>{label}</Text>
                    </View>
                    <TransliterationInput langCode={langCode} colors={colors}
                      style={{ borderWidth: 1.5, borderColor: stepColor + '50', borderRadius: 12,
                        padding: 14, fontSize: 15, color: colors.textMain, backgroundColor: colors.bgDark,
                        minHeight: 90, textAlignVertical: 'top', lineHeight: 22 }}
                      placeholder={placeholder}
                      placeholderTextColor={colors.textDim}
                      value={ans.priorKnowledge?.[key] ?? ''}
                      onChangeText={t => patchAns({ priorKnowledge: { ...(ans.priorKnowledge || { knows: '', predicts: '' }), [key]: t } })}
                      multiline
                    />
                  </View>
                ))}
                <Text style={{ fontSize: 11, color: colors.textDim, textAlign: 'center' }}>Share your ideas — there are no wrong answers here!</Text>
              </View>
            )}

            {/* ── REFLECTION STEPS: All numbered-prompt reflection steps across subjects ──
                Covers: math_reflection, writing_reflection, social_synthesis, communication,
                        artistic_reflection, digital_citizenship, physical_reflection          */}
            {(['math_reflection','writing_reflection','social_synthesis','communication','artistic_reflection','digital_citizenship','physical_reflection'] as StepType[]).includes(step.type) && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionLabel, { color: stepColor }]}>Reflect on Your Learning</Text>
                {(step.reflectionPrompts?.length ? step.reflectionPrompts
                  : step.sections?.length ? step.sections.map((s, i) => `Prompt ${i+1}: ${s}`)
                  : ['What did you learn?', 'What was challenging?', 'How does this connect to the world?']
                ).map((prompt, pi) => {
                  const sectionLabel = step.sections?.[pi] ?? `Prompt ${pi + 1}`;
                  return (
                    <View key={pi} style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: stepColor, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>{pi + 1}</Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: stepColor }}>{sectionLabel}</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 19, marginLeft: 28 }}>{prompt}</Text>
                      <TransliterationInput langCode={langCode} colors={colors}
                        style={{ borderWidth: 1.5, borderColor: stepColor + '40', borderRadius: 12,
                          padding: 14, fontSize: 15, color: colors.textMain, backgroundColor: colors.bgDark,
                          minHeight: 80, textAlignVertical: 'top', lineHeight: 22 }}
                        placeholder={`Write your response here...`}
                        placeholderTextColor={colors.textDim}
                        value={(ans.reflectionAnswers || [])[pi] ?? ''}
                        onChangeText={t => {
                          const current = ans.reflectionAnswers || ['', '', ''];
                          patchAns({ reflectionAnswers: current.map((r, j) => j === pi ? t : r) });
                        }}
                        multiline
                      />
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── SECTIONS STEPS: All multi-section writing steps across subjects ──
                Covers: reading_comprehension, research_notes, language_practice,
                        tech_skill_practice, skill_practice (+ existing structured_writing) */}
            {(['structured_writing','reading_comprehension','research_notes','language_practice','tech_skill_practice','skill_practice'] as StepType[]).includes(step.type) && (
              <View style={{ gap: 12 }}>
                {step.provocation ? (
                  <View testID="reading-passage" style={{ padding: 16, borderRadius: 14, backgroundColor: colors.bgDark, borderWidth: 1.5, borderColor: stepColor + '40', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="book-open" size={14} color={stepColor} />
                      <Text style={{ fontSize: 10, fontWeight: '800', color: stepColor, textTransform: 'uppercase', letterSpacing: 0.8 }}>Read this passage</Text>
                    </View>
                    <Text style={{ fontSize: 15, color: colors.textMain, lineHeight: 25 }}>{step.provocation}</Text>
                  </View>
                ) : null}
                {(step.wordBank?.length ?? 0) > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={[styles.sectionLabel, { color: stepColor }]}>Word Bank — tap to insert</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {step.wordBank!.map((word, wi) => (
                        <TouchableOpacity key={wi} activeOpacity={0.75}
                          onPress={() => {
                            const si = focusedSectionIdx.current;
                            const cur = ans.sections[si]?.text ?? '';
                            // "అమ్మ (amma) – mother" inserts just the word
                            const bare = word.split(/\s+[(–-]/)[0].trim() || word;
                            const appended = cur ? cur + ' ' + bare : bare;
                            patchAns({ sections: ans.sections.map((s, j) => j === si ? { ...s, text: appended } : s) });
                          }}
                          style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: stepColor + '15', borderWidth: 1, borderColor: stepColor + '40' }}>
                          <Text style={{ fontSize: 13, color: stepColor, fontWeight: '600' }}>{word}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                {ans.sections.map((sec, si) => (
                  <View key={si} style={{ gap: 6 }}>
                    {sec.label.length > 30 ? (
                      // Long labels are real questions — show them as readable text
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMain, lineHeight: 21 }}>{si + 1}. {sec.label}</Text>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: stepColor }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 }}>{sec.label}</Text>
                        </View>
                      </View>
                    )}
                    <TransliterationInput langCode={langCode} colors={colors}
                      style={{ borderWidth: 1.5, borderColor: stepColor + '40', borderRadius: 12,
                        padding: 14, fontSize: 15, color: colors.textMain, backgroundColor: colors.bgDark,
                        minHeight: 90, textAlignVertical: 'top', lineHeight: 24 }}
                      placeholder={sec.label.length > 30 ? 'Write your answer here...' : `Write your ${sec.label.toLowerCase()} here...`}
                      placeholderTextColor={colors.textDim}
                      value={sec.text}
                      onFocus={() => { focusedSectionIdx.current = si; }}
                      onChangeText={t => patchAns({ sections: ans.sections.map((s, j) => j === si ? { ...s, text: t } : s) })}
                      multiline
                    />
                  </View>
                ))}
              </View>
            )}


            {/* Navigation */}
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'center', justifyContent: 'center' }}>
              {currentStep > 0 && (
                <TouchableOpacity style={[styles.submitBtn, styles.compactBtn, { backgroundColor: colors.borderColor }]}
                  onPress={() => setCurrentStep(s => s - 1)} activeOpacity={0.85}>
                  <Feather name="chevron-left" size={16} color={colors.textMuted} />
                  <Text style={[styles.submitBtnText, { color: colors.textMuted }]}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.submitBtn, styles.compactBtn, { backgroundColor: stepColor }]}
                onPress={() => setCurrentStep(s => s + 1)} activeOpacity={0.85}>
                <Text style={styles.submitBtnText}>{isLastDataStep ? 'Check Yourself' : 'Next Step'}</Text>
                <Feather name={isLastDataStep ? 'check-square' : 'chevron-right'} size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
