import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { useTheme } from '../../../../context/ThemeContext';
import { useStudentData } from '../../../../context/StudentDataContext';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';
import LEARNING_PATHS_SERVER_URL from '../../../../config/learningPathsServerUrl';
import { makeModalStyles } from '../styles';
import { SUBJECT_COLOR } from '../constants';
import { getStamp, assignmentLanguageText } from '../utils';
import TransliterationInput, { resolveTypingLang } from '../../../../components/common/TransliterationInput';
import type { Assignment, QuizQuestion, PerQ, GradeResult } from '../types';
import { AssignmentErrorBoundary } from './AssignmentErrorBoundary';
import { ModalTopBar } from './ModalTopBar';
import { ConfirmCloseOverlay } from './ConfirmCloseOverlay';

// ── Quiz Modal ────────────────────────────────────────────────────────────────

export function QuizModal({ assignment, colors, onClose, onSubmitted }: {
  assignment: Assignment; colors: AppColors;
  onClose: () => void; onSubmitted: (updated: any) => void;
}) {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeModalStyles(colors), [colors]);
  const { studentId } = useStudentData();
  const color = SUBJECT_COLOR[assignment.subject] ?? '#BAA467';
  const questions = assignment.quizQuestions || [];

  const [currentQ,       setCurrentQ]      = useState(0);
  const [answers,        setAnswers]       = useState<Record<number, string>>({});
  const [showHint,       setShowHint]      = useState(false);
  const [submitting,     setSubmitting]    = useState(false);
  const [result,         setResult]        = useState<GradeResult | null>(null);
  const [showReview,     setShowReview]    = useState(false);
  const [aiExplanations, setAiExplanations] = useState<Record<number, string>>({});
  const [shortInput,     setShortInput]    = useState('');
  const [showConfirm,    setShowConfirm]   = useState(false);
  // Fill-in-the-blank state
  const [fillInput,        setFillInput]        = useState<Record<number, string>>({});
  const [fillAttempts,     setFillAttempts]     = useState<Record<number, number>>({});
  const [fillFeedback,     setFillFeedback]     = useState<Record<number, 'wrong1' | 'wrong2' | 'revealed'>>({});
  const [fillValidating,   setFillValidating]   = useState(false);
  // Which attempt # the student got it correct (1 = full points, 2 = partial, revealed = 0)
  const [fillCorrectAttempt, setFillCorrectAttempt] = useState<Record<number, number>>({});
  const [showCheckNudge,   setShowCheckNudge]   = useState(false);

  const q         = questions[currentQ];
  const langCode  = resolveTypingLang(assignment.subject, q?.question, assignmentLanguageText(assignment));
  const isLast    = currentQ === questions.length - 1;
  const isFillQ   = q?.type === 'fill_blank';
  const answered  = answers[currentQ] !== undefined;
  // For fill_blank: has the student typed something but not yet checked?
  const fillTypedNotChecked = isFillQ && !answered && !!(fillInput[currentQ] || '').trim();
  const stamp     = result ? getStamp(result.score) : null;

  function selectOption(option: string) {
    setAnswers(prev => ({ ...prev, [currentQ]: option }));
  }
  function submitShort() {
    if (shortInput.trim()) {
      setAnswers(prev => ({ ...prev, [currentQ]: shortInput.trim() }));
      setShortInput('');
    }
  }
  function next() { setShowHint(false); setShortInput(''); setShowCheckNudge(false); setCurrentQ(i => i + 1); }
  function prev() { setShowHint(false); setShortInput(''); setShowCheckNudge(false); setCurrentQ(i => i - 1); }

  async function submitFillBlank() {
    const currentInput = (fillInput[currentQ] || '').trim();
    if (!currentInput) return;
    setFillValidating(true);
    try {
      const resp = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/validate-fill-blank`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // The question lets the server's AI check judge a right word in other words.
        body: JSON.stringify({ studentAnswer: currentInput, correctAnswer: q.correct, question: q.question }),
      });
      const { correct } = await resp.json();
      if (correct) {
        const attemptNum = (fillAttempts[currentQ] || 0) + 1;
        setFillCorrectAttempt(prev => ({ ...prev, [currentQ]: attemptNum }));
        // Encode attempt in answer so backend can score: [attempt:N] prefix
        setAnswers(prev => ({ ...prev, [currentQ]: `[attempt:${attemptNum}] ${currentInput}` }));
        setFillInput(prev => ({ ...prev, [currentQ]: '' }));
        setShowCheckNudge(false);
      } else {
        const attempts = (fillAttempts[currentQ] || 0) + 1;
        setFillAttempts(prev => ({ ...prev, [currentQ]: attempts }));
        if (attempts === 1) setFillFeedback(prev => ({ ...prev, [currentQ]: 'wrong1' }));
        else if (attempts === 2) setFillFeedback(prev => ({ ...prev, [currentQ]: 'wrong2' }));
        else {
          // 3rd attempt — reveal answer
          setFillFeedback(prev => ({ ...prev, [currentQ]: 'revealed' }));
          setAnswers(prev => ({ ...prev, [currentQ]: `[revealed] ${q.correct}` }));
          setFillInput(prev => ({ ...prev, [currentQ]: '' }));
        }
      }
    } catch {
      // network error — just save as-is
      setAnswers(prev => ({ ...prev, [currentQ]: currentInput }));
      setFillInput(prev => ({ ...prev, [currentQ]: '' }));
    } finally {
      setFillValidating(false);
    }
  }

  async function handleSubmit() {
    setShowReview(false); setSubmitting(true);
    try {
      const quizAnswers = questions.map((_, i) => ({ answer: answers[i] || '' }));
      const ctrl1 = new AbortController();
      const t1 = setTimeout(() => ctrl1.abort(), 120_000);
      const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/${assignment.id}/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, quizAnswers, quizQuestions: questions }),
        signal: ctrl1.signal,
      }).finally(() => clearTimeout(t1));
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
      } else { Alert.alert('Error', data.error || 'Submission failed'); }
    } catch { Alert.alert('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  }

  async function explainWrong(idx: number, q: QuizQuestion, studentAns: string) {
    try {
      const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/ibpyp/explain-wrong`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: assignment.chapter,
          subject: assignment.subject,
          grade: assignment.grade || 'Grade 4',
          question: q.question,
          wrongAnswer: studentAns,
          correctAnswer: q.correct,
        }),
      });
      const data = await res.json();
      setAiExplanations(prev => ({ ...prev, [idx]: data.explanation || q.explanation || 'The correct answer is shown above.' }));
    } catch {
      setAiExplanations(prev => ({ ...prev, [idx]: q.explanation || 'The correct answer is shown above.' }));
    }
  }

  // Auto-fetch explanations for all wrong answers when result arrives.
  // MUST be declared before any conditional return to keep hook order stable (React error #300).
  useEffect(() => {
    if (!result) return;
    result.perQuestion.forEach((q: any, idx: number) => {
      if (q?.correct) return;
      const origQ = questions[idx];
      // For old assignments without quizQuestions, build a minimal QuizQuestion from perQuestion data
      const fallbackQ: QuizQuestion = origQ || {
        id: String(idx),
        question: q.question,
        type: 'mcq',
        correct: q.correctAnswer || '',
        explanation: q.explanation || '',
      };
      explainWrong(idx, fallbackQ, q.studentAnswer || '');
    });
  }, [result]);

  // Spinner
  if (submitting) return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, styles.quizSheet, { justifyContent: 'center', alignItems: 'center', paddingVertical: 80, gap: 24 }]}>
          <ActivityIndicator size="large" color={color} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textMain, textAlign: 'center', fontFamily: fonts.serif }}>Checking your answers...</Text>
        </View>
      </View>
    </Modal>
  );

  // Results
  if (result) return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <AssignmentErrorBoundary colors={colors}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, styles.quizSheet]}>
          <View style={[styles.header, { borderBottomColor: colors.borderColor }]}>
            <View style={[styles.subjectDot, { backgroundColor: color + '20' }]}>
              <Feather name="check-circle" size={18} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Quiz Results</Text>
              <Text style={styles.meta}>{assignment.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose}><Feather name="x" size={22} color={colors.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { maxWidth: 720, alignSelf: 'center', width: '100%' }]}>
            <View style={styles.resultBox}>
              <View style={[styles.scoreBadge, { backgroundColor: color + '15', borderColor: color + '30' }]}>
                <Text style={[styles.scoreNum, { color }]}>{result.score != null ? `${result.score}%` : 'Done'}</Text>
                <Text style={[styles.scoreLabel, { color }]}>{result.score != null ? result.score >= 85 ? 'Excellent!' : result.score >= 60 ? 'Good job!' : 'Keep going!' : 'Submitted'}</Text>
              </View>
              {stamp && (() => {
                const stampLabel = typeof stamp === 'string' ? stamp : (stamp.label || String(stamp));
                const stampColor = typeof stamp === 'object' && stamp.color ? stamp.color : (stampLabel.includes('Amazing') ? '#4CAF50' : stampLabel.includes('Good') ? '#2196F3' : '#FF9800');
                const stampIcon: any = typeof stamp === 'object' && stamp.icon ? stamp.icon : (stampLabel.includes('Amazing') ? 'star' : stampLabel.includes('Good') ? 'thumbs-up' : 'zap');
                return (
                  <View style={[styles.stampCard, { backgroundColor: stampColor + '15', borderColor: stampColor + '40' }]}>
                    <View style={[styles.stampIcon, { backgroundColor: stampColor }]}><Feather name={stampIcon} size={20} color="#fff" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stampLabel}>Stamp earned!</Text>
                      <Text style={[styles.stampName, { color: stampColor }]}>{stampLabel}</Text>
                    </View>
                  </View>
                );
              })()}
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackTitle}>Feedforward</Text>
                <Text style={styles.feedbackText}>{result.feedback}</Text>
              </View>
              {result.perQuestion.length > 0 ? (
                <View style={[styles.criteriaRow, { borderColor: color + '35', backgroundColor: color + '08' }]}>
                  <Feather name="bar-chart-2" size={16} color={color} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.criteriaLabel, { color }]}>Exact Result</Text>
                    <Text style={[styles.criteriaText, { color: colors.textMuted }]}>
                      Correct {result.perQuestion.filter((pq: any) => pq?.correct).length} of {result.perQuestion.length} questions
                    </Text>
                  </View>
                </View>
              ) : null}
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
                  <Feather name="book-open" size={16} color={colors.accentYellow} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.criteriaLabel, { color: colors.accentYellow }]}>Review this topic</Text>
                    <Text style={[styles.criteriaText, { color: colors.textMuted }]}>{result.improve}</Text>
                  </View>
                </View>
              ) : null}
              {/* ── Questions you got RIGHT ── */}
              {result.perQuestion.filter((q: any) => q?.correct).length > 0 && (
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: colors.accentGreen + '20', alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name="check-circle" size={15} color={colors.accentGreen} />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.accentGreen }}>
                      Questions You Got Right ({result.perQuestion.filter((q: any) => q?.correct).length})
                    </Text>
                  </View>
                  {result.perQuestion.filter((q: any) => q?.correct).map((q: any, idx: number) => (
                    <View key={idx} style={[styles.qRow, { borderColor: colors.accentGreen + '30', backgroundColor: colors.cardDark, borderLeftWidth: 3, borderLeftColor: colors.accentGreen }]}>
                      <View style={styles.qLeft}>
                        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accentGreen + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Feather name="check" size={13} color={colors.accentGreen} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.qText}>{q.question}</Text>
                          {q.studentAnswer ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: colors.bgDark }}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accentGreen, width: 90, letterSpacing: 0.3 }}>Your answer</Text>
                              <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: colors.accentGreen }}>{q.studentAnswer}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* ── Questions you got WRONG ── */}
              {result.perQuestion.filter((q: any) => !q?.correct).length > 0 && (
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: '#BAA46720', alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name="x-circle" size={15} color="#BAA467" />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#BAA467' }}>
                      Questions You Got Wrong ({result.perQuestion.filter((q: any) => !q?.correct).length})
                    </Text>
                  </View>
                  {result.perQuestion.filter((q: any) => !q?.correct).map((q: any, idx: number) => {
                    const origIdx = result.perQuestion.indexOf(q);
                    const aiExp = aiExplanations[origIdx];
                    return (
                      <View key={idx} style={[styles.qRow, { borderColor: '#BAA46730', backgroundColor: colors.cardDark, borderLeftWidth: 3, borderLeftColor: '#BAA467' }]}>
                        <View style={styles.qLeft}>
                          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#BAA46720', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Feather name="x" size={13} color="#BAA467" />
                          </View>
                          <View style={{ flex: 1, gap: 7 }}>
                            <Text style={styles.qText}>{q.question}</Text>
                            {q.studentAnswer ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, backgroundColor: colors.bgDark }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#C9A24E', width: 100, letterSpacing: 0.3 }}>Your answer</Text>
                                <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#C9A24E' }}>{q.studentAnswer}</Text>
                              </View>
                            ) : null}
                            {q.correctAnswer ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, backgroundColor: colors.bgDark }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#BAA467', width: 100, letterSpacing: 0.3 }}>Correct answer</Text>
                                <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#BAA467' }}>{q.correctAnswer}</Text>
                              </View>
                            ) : null}
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 10, backgroundColor: isDark ? '#171612' : '#F8F6ED', borderWidth: 1, borderColor: '#BAA46725' }}>
                              {aiExp ? (
                                <>
                                  <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: '#BAA46720', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Feather name="book-open" size={12} color="#BAA467" />
                                  </View>
                                  <Text style={{ flex: 1, fontSize: 13, color: colors.textMain, lineHeight: 21 }}>
                                    <Text style={{ fontWeight: '800', color: '#BAA467' }}>Aivorah: </Text>{aiExp}
                                  </Text>
                                </>
                              ) : (
                                <>
                                  <ActivityIndicator size="small" color="#BAA467" />
                                  <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic' }}>Aivorah is preparing your explanation…</Text>
                                </>
                              )}
                            </View>
                          </View>
                        </View>
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
      </AssignmentErrorBoundary>
    </Modal>
  );

  // Review before submit
  if (showReview) return (
    <Modal visible animationType="slide" transparent onRequestClose={() => setShowReview(false)}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, styles.quizSheet]}>
          <View style={[styles.header, { borderBottomColor: colors.borderColor }]}>
            <View style={[styles.subjectDot, { backgroundColor: color + '20' }]}><Feather name="list" size={18} color={color} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Review Answers</Text>
              <Text style={styles.meta}>{Object.keys(answers).length} of {questions.length} answered</Text>
            </View>
            <TouchableOpacity onPress={() => setShowReview(false)}><Feather name="x" size={22} color={colors.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 48, alignItems: 'center' }}>
            <View style={{ maxWidth: 720, width: '100%', gap: 0 }}>
            {questions.map((q, i) => (
              <TouchableOpacity key={i} onPress={() => { setCurrentQ(i); setShowReview(false); }} activeOpacity={0.8}
                style={[styles.qReviewRow, { borderColor: answers[i] ? color + '40' : colors.accentRed + '40', backgroundColor: answers[i] ? color + '06' : colors.accentRed + '06' }]}>
                <View style={[styles.taskNum, { backgroundColor: answers[i] ? color : colors.accentRed }]}>
                  <Text style={[styles.taskNumText, { color: '#fff' }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: colors.textMain, fontWeight: '600' }} numberOfLines={1}>{q.question}</Text>
                  {(() => {
                    const ans = answers[i];
                    if (!ans) return <Text style={{ fontSize: 11, color: colors.accentRed, marginTop: 2, fontWeight: '600' }}>Not answered — tap to answer</Text>;
                    if (ans.startsWith('[revealed]')) return <Text style={{ fontSize: 11, color: colors.accentRed, marginTop: 2, fontWeight: '600' }}>Revealed: {ans.replace(/^\[revealed\]\s*/, '')}</Text>;
                    const attemptMatch = ans.match(/^\[attempt:(\d+)\]\s*/);
                    const displayAns = attemptMatch ? ans.replace(/^\[attempt:\d+\]\s*/, '') : ans;
                    const attemptNum = attemptMatch ? parseInt(attemptMatch[1]) : 1;
                    const pointsLabel = attemptNum === 1 ? 'Full points' : 'Partial points';
                    const pointsColor = attemptNum === 1 ? colors.accentGreen : '#E8A020';
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={{ fontSize: 11, color: colors.accentGreen, fontWeight: '600' }} numberOfLines={1}>{displayAns}</Text>
                        <Text style={{ fontSize: 10, color: pointsColor, fontWeight: '700' }}>· {pointsLabel}</Text>
                      </View>
                    );
                  })()}
                </View>
              </TouchableOpacity>
            ))}
            {Object.keys(answers).length < questions.length && (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: colors.accentYellow + '12', borderWidth: 1, borderColor: colors.accentYellow + '30', marginBottom: 12 }}>
                <Feather name="alert-triangle" size={14} color={colors.accentYellow} />
                <Text style={{ flex: 1, fontSize: 12, color: colors.accentYellow, fontWeight: '600' }}>
                  {questions.length - Object.keys(answers).length} question{questions.length - Object.keys(answers).length > 1 ? 's' : ''} unanswered.
                </Text>
              </View>
            )}
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: color, maxWidth: 360, alignSelf: 'center', width: '100%' }]} onPress={handleSubmit} activeOpacity={0.85}>
              <Feather name="send" size={16} color="#fff" />
              <Text style={styles.submitBtnText}>Submit Quiz</Text>
            </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (!q) return null;

  // Question step
  return (
    <Modal visible animationType="slide" transparent onRequestClose={() => setShowConfirm(true)}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, styles.quizSheet]}>
          <ModalTopBar
            title={assignment.title}
            subtitle={`Question ${currentQ + 1} of ${questions.length} · ${assignment.subject}`}
            color={color} colors={colors} icon="help-circle"
            onBack={() => setShowConfirm(true)}
          />
          <ConfirmCloseOverlay visible={showConfirm} color={color} colors={colors}
            onConfirm={onClose} onCancel={() => setShowConfirm(false)} />

          {/* Progress dots */}
          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10, gap: 5, maxWidth: 720, width: '100%' }}>
              {questions.map((_, i) => (
                <View key={i} style={{ flex: 1, height: 4, borderRadius: 2,
                  backgroundColor: answers[i] !== undefined ? color : i === currentQ ? color + '60' : colors.borderColor }} />
              ))}
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 48, alignItems: 'center' }}>
          <View style={{ maxWidth: 720, width: '100%', gap: 16 }}>
            {/* Question */}
            <View style={[styles.questionCard, { borderColor: color + '30', backgroundColor: color + '06' }]}>
              <View style={[styles.qNumBadge, { backgroundColor: color }]}>
                <Text style={styles.qNumBadgeText}>Q{currentQ + 1} - {q.type === 'mcq' ? 'Multiple Choice' : q.type === 'fill_blank' ? 'Fill in the Blank' : 'Short Answer'}</Text>
              </View>
              <Text style={styles.questionText}>{q.question}</Text>

              {/* Hint toggle */}
              {q.hint && (
                <TouchableOpacity onPress={() => setShowHint(h => !h)} activeOpacity={0.75}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
                  <Feather name="help-circle" size={13} color={color} />
                  <Text style={{ fontSize: 12, color, fontWeight: '600' }}>{showHint ? 'Hide hint' : 'Show hint'}</Text>
                </TouchableOpacity>
              )}
              {showHint && q.hint && (
                <View style={{ padding: 10, borderRadius: 8, backgroundColor: color + '12', borderWidth: 1, borderColor: color + '30' }}>
                  <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic' }}>{q.hint}</Text>
                </View>
              )}
            </View>

            {/* MCQ options */}
            {q.type === 'mcq' && q.options && (
              <View style={{ gap: 10 }}>
                {q.options.map((opt, oi) => {
                  const selected = answers[currentQ] === opt;
                  return (
                    <TouchableOpacity key={oi} onPress={() => selectOption(opt)} activeOpacity={0.75}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5,
                        borderColor: selected ? color : colors.borderColor,
                        backgroundColor: selected ? color + '12' : colors.bgDark }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5,
                        borderColor: selected ? color : colors.textDim,
                        backgroundColor: selected ? color : 'transparent',
                        alignItems: 'center', justifyContent: 'center' }}>
                        {selected && <Feather name="check" size={14} color="#fff" />}
                      </View>
                      <Text style={{ flex: 1, fontSize: 14, color: selected ? colors.textMain : colors.textMuted, fontWeight: selected ? '600' : '400', lineHeight: 20 }}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Short answer */}
            {q.type === 'short_answer' && (
              <View style={{ gap: 8 }}>
                {answers[currentQ] ? (
                  <View style={{ gap: 6 }}>
                    <View style={{ padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: color + '60', backgroundColor: color + '08' }}>
                      <Text style={{ fontSize: 14, color: colors.textMain, lineHeight: 22 }}>{answers[currentQ]}</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setAnswers(prev => { const n = {...prev}; delete n[currentQ]; return n; }); setShortInput(answers[currentQ] || ''); }}
                      activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' }}>
                      <Feather name="edit-2" size={12} color={color} />
                      <Text style={{ fontSize: 12, color, fontWeight: '600' }}>Edit answer</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    <TransliterationInput langCode={langCode} colors={colors}
                      style={{ borderWidth: 1.5, borderColor: color + '60', borderRadius: 12, padding: 14,
                        fontSize: 15, color: colors.textMain, backgroundColor: colors.bgDark,
                        minHeight: 90, textAlignVertical: 'top', lineHeight: 24 }}
                      placeholder="Write your answer here..."
                      placeholderTextColor={colors.textDim}
                      value={shortInput}
                      onChangeText={setShortInput}
                      multiline
                    />
                    <TouchableOpacity
                      style={[styles.submitBtn, styles.compactBtn, { backgroundColor: color, alignSelf: 'flex-start' }]}
                      onPress={submitShort}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.submitBtnText}>Save Answer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Fill in the blank */}
            {q.type === 'fill_blank' && (() => {
              const fb = fillFeedback[currentQ];
              const isRevealed = fb === 'revealed';
              const isCorrect  = answers[currentQ] && !answers[currentQ].startsWith('[revealed]');
              const displayAnswer = (answers[currentQ] || '').replace(/^\[attempt:\d+\]\s*/, '');
              const attemptNum = fillCorrectAttempt[currentQ] || 1;

              if (isCorrect) return (
                <View style={{ gap: 6 }}>
                  <View style={{ padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#4A9E7060', backgroundColor: '#4A9E7010' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="check-circle" size={14} color="#4A9E70" />
                      <Text style={{ fontSize: 14, color: '#4A9E70', fontWeight: '700' }}>{displayAnswer}</Text>
                      <Text style={{ fontSize: 11, color: attemptNum === 1 ? '#4A9E70' : '#E8A020', fontWeight: '700', marginLeft: 'auto' as any }}>
                        {attemptNum === 1 ? 'Full points' : 'Partial points'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => { setAnswers(prev => { const n = {...prev}; delete n[currentQ]; return n; }); setFillFeedback(prev => { const n = {...prev}; delete n[currentQ]; return n; }); setFillAttempts(prev => { const n = {...prev}; delete n[currentQ]; return n; }); setFillInput(prev => ({ ...prev, [currentQ]: '' })); }}
                    activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' }}>
                    <Feather name="edit-2" size={12} color={color} />
                    <Text style={{ fontSize: 12, color, fontWeight: '600' }}>Try again</Text>
                  </TouchableOpacity>
                </View>
              );

              if (isRevealed) return (
                <View style={{ gap: 8 }}>
                  <View style={{ padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#C98A8A50', backgroundColor: '#C98A8A10', gap: 6 }}>
                    <Text style={{ fontSize: 12, color: '#C98A8A', fontWeight: '700' }}>Answer revealed</Text>
                    <Text style={{ fontSize: 14, color: colors.textMain, fontWeight: '600' }}>{q.correct}</Text>
                    {q.explanation ? <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 20, marginTop: 2 }}>{q.explanation}</Text> : null}
                  </View>
                </View>
              );

              return (
                <View style={{ gap: 10, width: '100%' }}>
                  {/* Question with blank highlighted */}
                  <TransliterationInput langCode={langCode} colors={colors}
                    style={{ borderWidth: 1.5, borderColor: fb ? '#C98A8A60' : color + '60', borderRadius: 12,
                      padding: 14, fontSize: 15, color: colors.textMain, backgroundColor: colors.bgDark, width: '100%' }}
                    placeholder="Type your answer here..."
                    placeholderTextColor={colors.textDim}
                    value={fillInput[currentQ] || ''}
                    onChangeText={text => setFillInput(prev => ({ ...prev, [currentQ]: text }))}
                    onSubmitEditing={submitFillBlank}
                    returnKeyType="done"
                    editable={!fillValidating}
                  />

                  {/* Feedback nudges */}
                  {fb === 'wrong1' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
                      <Feather name="alert-circle" size={13} color="#E8A020" />
                      <Text style={{ fontSize: 13, color: '#E8A020', fontWeight: '600' }}>Not quite — want to try again?</Text>
                    </View>
                  )}
                  {fb === 'wrong2' && (
                    <View style={{ padding: 10, borderRadius: 10, backgroundColor: color + '12', borderWidth: 1, borderColor: color + '30', gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Feather name="help-circle" size={13} color={color} />
                        <Text style={{ fontSize: 12, color, fontWeight: '700' }}>Hint</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic' }}>{q.hint || 'Think carefully about the topic!'}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.submitBtn, styles.compactBtn, { backgroundColor: fillValidating ? color + '60' : color, alignSelf: 'flex-start' }]}
                    onPress={submitFillBlank}
                    activeOpacity={0.85}
                    disabled={fillValidating || !(fillInput[currentQ] || '').trim()}
                  >
                    {fillValidating
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.submitBtnText}>Check Answer</Text>
                    }
                  </TouchableOpacity>
                </View>
              );
            })()}

            {/* Check nudge for fill_blank */}
            {showCheckNudge && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8,
                backgroundColor: '#E8A02015', borderWidth: 1, borderColor: '#E8A02040' }}>
                <Feather name="alert-circle" size={13} color="#E8A020" />
                <Text style={{ fontSize: 12, color: '#E8A020', fontWeight: '600', flex: 1 }}>
                  Please check your answer before moving to the next question.
                </Text>
              </View>
            )}

            {/* Navigation */}
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              {currentQ > 0 && (
                <TouchableOpacity
                  style={[styles.submitBtn, styles.compactBtn, { backgroundColor: colors.borderColor }]}
                  onPress={() => { setShowCheckNudge(false); prev(); }}
                  activeOpacity={0.85}
                >
                  <Feather name="chevron-left" size={16} color={colors.textMuted} />
                  <Text style={[styles.submitBtnText, { color: colors.textMuted }]}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.submitBtn, styles.compactBtn, { backgroundColor: answered ? color : colors.borderColor }]}
                onPress={() => {
                  if (fillTypedNotChecked) { setShowCheckNudge(true); return; }
                  setShowCheckNudge(false);
                  isLast ? setShowReview(true) : next();
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.submitBtnText, { color: answered ? '#fff' : colors.textMuted }]}>
                  {isLast ? 'Review & Submit' : 'Next Question'}
                </Text>
                <Feather name={isLast ? 'check-square' : 'chevron-right'} size={16} color={answered ? '#fff' : colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Skip only allowed for non-fill_blank questions */}
            {!answered && !isFillQ && (
              <TouchableOpacity onPress={() => { setShowCheckNudge(false); isLast ? setShowReview(true) : next(); }} activeOpacity={0.7} style={{ alignSelf: 'center' }}>
                <Text style={{ fontSize: 12, color: colors.textDim, textDecorationLine: 'underline' }}>Skip this question</Text>
              </TouchableOpacity>
            )}
          </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
