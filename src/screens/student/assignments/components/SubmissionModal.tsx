import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert, Image, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { useStudentData } from '../../../../context/StudentDataContext';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';
import * as ImagePicker from 'expo-image-picker';
import { makeModalStyles } from '../styles';
import { SUBJECT_COLOR, SUBJECT_ICON } from '../constants';
import { getStamp, scoreBadge, assignmentLanguageText } from '../utils';
import TransliterationInput, { resolveTypingLang } from '../../../../components/common/TransliterationInput';
import type { Assignment, PageAnswer, PerQ, GradeResult } from '../types';
import { ModalTopBar } from './ModalTopBar';
import { ConfirmCloseOverlay } from './ConfirmCloseOverlay';
import { WorksheetPageImage, WorksheetRefThumb } from './WorksheetPageImage';

// ── Submission Modal ──────────────────────────────────────────────────────────
// Flow: Page 1 image → upload answer → Page 2 → upload → ... → Review → Submit → Results

export function SubmissionModal({ assignment, colors, onClose, onSubmitted }: {
  assignment: Assignment;
  colors: AppColors;
  onClose: () => void;
  onSubmitted: (updated: Assignment & { aiFeedback: string; perQuestion: any[] }) => void;
}) {
  const styles = useMemo(() => makeModalStyles(colors), [colors]);
  const { studentId } = useStudentData();
  const color = SUBJECT_COLOR[assignment.subject] ?? '#BAA467';

  // Pages = worksheet images uploaded by teacher
  const pages: string[] = (assignment.documentUrls?.length ?? 0) > 0
    ? assignment.documentUrls!
    : assignment.documentUrl ? [assignment.documentUrl] : [];

  // Extracted questions from teacher
  const questions: any[] = assignment.questions || [];
  const hasQuestions = questions.length > 0;

  const totalSteps = hasQuestions ? 1 : (pages.length || 1); // questions mode = single step

  // answers[i] = student's photo answer for page i (legacy page-by-page mode)
  const [answers, setAnswers] = useState<PageAnswer[]>(() =>
    Array.from({ length: pages.length || 1 }, () => ({ preview: null, base64: null, mime: 'image/jpeg' }))
  );
  // textAnswers[i] = typed text answer per question
  const [textAnswers, setTextAnswers] = useState<string[]>(() =>
    Array.from({ length: questions.length }, () => '')
  );
  // questionPhotos[i] = optional photo per question
  const [questionPhotos, setQuestionPhotos] = useState<PageAnswer[]>(() =>
    Array.from({ length: questions.length }, () => ({ preview: null, base64: null, mime: 'image/jpeg' }))
  );
  const [step, setStep]           = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]       = useState<GradeResult | null>(null);

  const currentAnswer = answers[step] ?? { preview: null, base64: null, mime: 'image/jpeg' };
  const answeredCount = hasQuestions
    ? textAnswers.filter(a => a.trim()).length + questionPhotos.filter(a => a.base64).length
    : answers.filter(a => a.base64).length;
  const stamp = result ? getStamp(result.score) : null;

  function setAns(stepIndex: number, a: Partial<PageAnswer>) {
    setAnswers(prev => prev.map((x, i) => i === stepIndex ? { ...x, ...a } : x));
  }

  async function pickPhoto(stepIndex: number) {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setAns(stepIndex, { preview: dataUrl, base64: dataUrl.split(',')[1], mime: file.type });
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photos.'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.7, base64: true });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setAns(stepIndex, { preview: asset.uri, base64: asset.base64 ?? null, mime: asset.mimeType ?? 'image/jpeg' });
    }
  }

  async function handleSubmit() {
    setShowReview(false);
    setSubmitting(true);
    try {
      // Build submission payload based on mode
      const questionImages = hasQuestions
        ? questionPhotos.map(a => ({ imageBase64: a.base64 || null, imageMime: a.mime }))
        : answers.map(a => ({ imageBase64: a.base64 || null, imageMime: a.mime }));
      const textAns = hasQuestions ? textAnswers : [];
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);
      const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/${assignment.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, answers: textAns, questionImages }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
      const data = await res.json();
      if (res.ok) {
        let feedbackText = data.aiFeedback || '';
        let stamp = ''; let wellDone = ''; let improve = ''; let pq: PerQ[] = []; let tFb = '';
        try {
          const parsed = JSON.parse(feedbackText);
          feedbackText = parsed.text     || feedbackText;
          stamp        = parsed.stamp    || '';
          wellDone     = parsed.wellDone || '';
          improve      = parsed.improve  || '';
          pq           = Array.isArray(parsed.perQuestion) ? parsed.perQuestion : (data.perQuestion || []);
          tFb          = parsed.teacherFeedback || '';
        } catch { pq = data.perQuestion || []; }
        setResult({ score: data.score, feedback: feedbackText, stamp, wellDone, improve, perQuestion: pq, teacherFeedback: tFb });
        onSubmitted(data);
      } else {
        Alert.alert('Error', data.error || 'Submission failed');
        setShowReview(true);
      }
    } catch {
      Alert.alert('Network error. Please try again.');
      setShowReview(true);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Grading screen ──
  if (submitting) {
    return (
      <Modal visible animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { justifyContent: 'center', alignItems: 'center', paddingVertical: 80, gap: 24 }]}>
            <ActivityIndicator size="large" color={color} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textMain, textAlign: 'center', fontFamily: fonts.serif }}>
              AI is grading your work...
            </Text>
            <Text style={{ fontSize: 13, color: colors.textDim, textAlign: 'center', lineHeight: 22, paddingHorizontal: 32 }}>
              Analysing each page and comparing with your answers.{'\n'}This takes 20–40 seconds.
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Results screen ──
  if (result) {
    return (
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
              <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                <Feather name="x" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              <View style={styles.resultBox}>
                {/* Score */}
                <View style={[styles.scoreBadge, { backgroundColor: color + '15', borderColor: color + '30' }]}>
                  <Text style={[styles.scoreNum, { color }]}>{result.score != null ? `${result.score}%` : 'Done'}</Text>
                  <Text style={[styles.scoreLabel, { color }]}>
                    {result.score != null ? result.score >= 85 ? 'Excellent work!' : result.score >= 60 ? 'Good effort!' : 'Keep practising!' : 'Submitted'}
                  </Text>
                </View>
                {/* Stamp */}
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
                {/* Feedback */}
                <View style={styles.feedbackCard}>
                  <Text style={styles.feedbackTitle}>Overall Feedback</Text>
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
                      <Text style={[styles.criteriaLabel, { color: colors.accentYellow }]}>Next time</Text>
                      <Text style={[styles.criteriaText, { color: colors.textMuted }]}>{result.improve}</Text>
                    </View>
                  </View>
                ) : null}
                {/* Per-page breakdown */}
                {result.perQuestion.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text style={styles.feedbackTitle}>Page by Page</Text>
                    {result.perQuestion.map((q, idx) => {
                      const qColor = !q.answered || q.needsReview ? colors.textDim : q.correct ? colors.accentGreen : (q.score ?? 0) >= 50 ? colors.accentYellow : colors.accentRed;
                      const qIcon = !q.answered ? 'minus-circle' : q.correct ? 'check-circle' : (q.score ?? 0) >= 50 ? 'alert-circle' : 'x-circle';
                      return (
                        <View key={idx} style={[styles.qRow, { borderColor: qColor + '40', backgroundColor: qColor + '08' }]}>
                          <View style={styles.qLeft}>
                            <Feather name={qIcon as any} size={16} color={qColor} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.qNum, { color: qColor }]}>Page {q.number ?? idx + 1}</Text>
                              {q.question ? <Text style={styles.qText} numberOfLines={2}>{q.question}</Text> : null}
                              <Text style={[styles.qComment, { color: q.answered ? colors.textMuted : qColor }]}>{q.comment}</Text>
                              {q.studentAnswer ? <Text style={[styles.qAnswer, { color: colors.textDim }]}>You wrote: {q.studentAnswer}</Text> : null}
                            </View>
                          </View>
                          <View style={[styles.qScore, { backgroundColor: qColor + '20' }]}>
                            <Text style={[styles.qScoreText, { color: qColor }]}>{scoreBadge(q).label}</Text>
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
      </Modal>
    );
  }

  // ── Review screen ──
  if (showReview) {
    const qAnsweredCount = hasQuestions
      ? questions.filter((_, i) => textAnswers[i]?.trim() || questionPhotos[i]?.base64).length
      : answers.filter(a => a.base64).length;
    const qTotal = hasQuestions ? questions.length : totalSteps;
    return (
      <Modal visible animationType="slide" transparent onRequestClose={() => setShowReview(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={[styles.header, { borderBottomColor: colors.borderColor }]}>
              <View style={[styles.subjectDot, { backgroundColor: color + '20' }]}>
                <Feather name="check-square" size={18} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Review Answers</Text>
                <Text style={styles.meta}>{qAnsweredCount} of {qTotal} {hasQuestions ? 'questions' : 'pages'} answered</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReview(false)} activeOpacity={0.7}>
                <Feather name="x" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              <Text style={{ fontSize: 13, color: colors.textDim, marginBottom: 12 }}>
                {hasQuestions ? 'Review your answers before submitting.' : 'Tap any page to go back and change your answer.'}
              </Text>
              {hasQuestions ? questions.map((q: any, i: number) => {
                const qText = typeof q === 'string' ? q : (q.question || '');
                const hasAnswer = textAnswers[i]?.trim() || questionPhotos[i]?.base64;
                return (
                  <TouchableOpacity key={i}
                    style={[styles.qReviewRow, { borderColor: hasAnswer ? color + '40' : colors.accentRed + '40', backgroundColor: hasAnswer ? color + '06' : colors.accentRed + '06' }]}
                    onPress={() => { setShowReview(false); }}
                    activeOpacity={0.8}>
                    <View style={[styles.taskNum, { backgroundColor: hasAnswer ? color : colors.accentRed }]}>
                      <Text style={[styles.taskNumText, { color: '#fff' }]}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMain }} numberOfLines={2}>{qText}</Text>
                      {textAnswers[i]?.trim() ? (
                        <Text style={{ fontSize: 11, color: colors.accentGreen, fontWeight: '600' }} numberOfLines={1}>Answer: {textAnswers[i]}</Text>
                      ) : questionPhotos[i]?.base64 ? (
                        <Text style={{ fontSize: 11, color: colors.accentGreen, fontWeight: '600' }}>Photo uploaded</Text>
                      ) : (
                        <Text style={{ fontSize: 11, color: colors.accentRed, fontWeight: '600' }}>Not answered</Text>
                      )}
                    </View>
                    {questionPhotos[i]?.preview ? (
                      <Image source={{ uri: questionPhotos[i].preview! }} style={{ width: 44, height: 44, borderRadius: 6 }} resizeMode="cover" />
                    ) : null}
                  </TouchableOpacity>
                );
              }) : answers.map((ans, i) => (
                <TouchableOpacity key={i}
                  style={[styles.qReviewRow, { borderColor: ans.base64 ? color + '40' : colors.accentRed + '40', backgroundColor: ans.base64 ? color + '06' : colors.accentRed + '06' }]}
                  onPress={() => { setStep(i); setShowReview(false); }}
                  activeOpacity={0.8}>
                  <View style={[styles.taskNum, { backgroundColor: ans.base64 ? color : colors.accentRed }]}>
                    <Text style={[styles.taskNumText, { color: '#fff' }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMain }}>Page {i + 1}</Text>
                    <Text style={{ fontSize: 11, color: ans.base64 ? colors.accentGreen : colors.accentRed, marginTop: 2, fontWeight: '600' }}>
                      {ans.base64 ? 'Answer uploaded' : 'No answer — tap to add'}
                    </Text>
                  </View>
                  {ans.preview ? (
                    <Image source={{ uri: ans.preview }} style={{ width: 56, height: 56, borderRadius: 8 }} resizeMode="cover" />
                  ) : (
                    <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: colors.borderColor, alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name="camera" size={22} color={colors.textDim} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              {qAnsweredCount === 0 && (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: colors.accentYellow + '12', borderWidth: 1, borderColor: colors.accentYellow + '30', marginBottom: 4 }}>
                  <Feather name="alert-triangle" size={14} color={colors.accentYellow} />
                  <Text style={{ flex: 1, fontSize: 12, color: colors.accentYellow, fontWeight: '600' }}>
                    No answers provided yet. Please go back and answer at least one question.
                  </Text>
                </View>
              )}
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: color }]} onPress={handleSubmit} activeOpacity={0.85}>
                <Feather name="send" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>Submit for AI Grading</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Page step (main flow) ──
  const pageUrl = pages[step] ?? null;
  const isLastStep = step === totalSteps - 1;

  // Question-based mode: show all questions with text inputs
  if (hasQuestions) {
    return (
      <Modal visible animationType="slide" transparent onRequestClose={() => setShowConfirm(true)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ModalTopBar
              title={assignment.title}
              subtitle={`${questions.length} Questions · ${assignment.subject}`}
              color={color} colors={colors}
              icon={SUBJECT_ICON[assignment.subject] ?? 'book-open'}
              onBack={() => setShowConfirm(true)}
            />
            <ConfirmCloseOverlay visible={showConfirm} color={color} colors={colors}
              onConfirm={onClose} onCancel={() => setShowConfirm(false)} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { gap: 16, maxWidth: 720, alignSelf: 'center', width: '100%' }]}>
              {/* Worksheet pages for reference — horizontal scroll with fixed-size thumbnails */}
              {pages.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: 0.8 }}>Worksheet Reference (tap to zoom)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {pages.map((url, idx) => (
                        <WorksheetRefThumb key={idx} url={url} pageNum={idx + 1} color={color} colors={colors} />
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Purpose / instructions */}
              {assignment.note ? (
                <View style={{ backgroundColor: color + '10', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: color + '25', gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Feather name="target" size={12} color={color} />
                    <Text style={{ fontSize: 10, fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: 0.8 }}>Purpose</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: colors.textMain, lineHeight: 20 }}>{assignment.note}</Text>
                </View>
              ) : null}

              {/* Questions with answer inputs */}
              <View style={{ gap: 14, maxWidth: 680, alignSelf: 'center', width: '100%' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: 0.8 }}>Answer Each Question</Text>
                {questions.map((q: any, qi: number) => {
                  const qText = typeof q === 'string' ? q : (q.question || '');
                  const qImage = typeof q === 'object' && q.croppedImage ? q.croppedImage : null;
                  return (
                    <View key={qi} style={{ borderRadius: 12, borderWidth: 1, borderColor: textAnswers[qi]?.trim() ? color + '40' : colors.borderColor, backgroundColor: colors.cardDark || colors.bgDark, overflow: 'hidden' }}>
                      {/* Question */}
                      <View style={{ padding: 14, gap: 8, backgroundColor: color + '08' }}>
                        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>{qi + 1}</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 14, color: colors.textMain, lineHeight: 22, fontWeight: '600' }}>{qText}</Text>
                        </View>
                        {qImage ? (
                          <View style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: color + '30', marginLeft: 36, maxWidth: 320 }}>
                            <Image source={{ uri: qImage }} style={{ width: '100%', height: 140, backgroundColor: '#fff' }} resizeMode="contain" />
                          </View>
                        ) : null}
                      </View>

                      {/* Answer input */}
                      <View style={{ padding: 14, gap: 8 }}>
                        <TransliterationInput colors={colors} langCode={resolveTypingLang(assignment.subject, qText, assignmentLanguageText(assignment))}
                          style={{
                            borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10,
                            padding: 12, minHeight: 60, fontSize: 14, color: colors.textMain,
                            backgroundColor: colors.bgDark, textAlignVertical: 'top',
                          }}
                          placeholder="Type your answer here..."
                          placeholderTextColor={colors.textDim}
                          value={textAnswers[qi] || ''}
                          onChangeText={(t) => setTextAnswers(prev => prev.map((v, i) => i === qi ? t : v))}
                          multiline
                        />
                        {/* Optional photo upload — hidden for parent-created
                            assignments (simple typed Q&A; no image-based answering). */}
                        {assignment.createdBy !== 'parent' && (questionPhotos[qi]?.preview ? (
                          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                            <Image source={{ uri: questionPhotos[qi].preview! }} style={{ width: 60, height: 60, borderRadius: 8 }} resizeMode="cover" />
                            <TouchableOpacity onPress={() => {
                              const input = document.createElement('input');
                              input.type = 'file'; input.accept = 'image/*';
                              input.onchange = (e: any) => {
                                const file = e.target.files?.[0]; if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  const dataUrl = ev.target?.result as string;
                                  setQuestionPhotos(prev => prev.map((v, i) => i === qi ? { preview: dataUrl, base64: dataUrl.split(',')[1], mime: file.type } : v));
                                };
                                reader.readAsDataURL(file);
                              };
                              input.click();
                            }} activeOpacity={0.7}>
                              <Text style={{ fontSize: 11, color, fontWeight: '600' }}>Replace</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setQuestionPhotos(prev => prev.map((v, i) => i === qi ? { preview: null, base64: null, mime: 'image/jpeg' } : v))} activeOpacity={0.7}>
                              <Text style={{ fontSize: 11, color: colors.accentRed, fontWeight: '600' }}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: color + '10', borderWidth: 1, borderColor: color + '30' }}
                            onPress={() => {
                              if (Platform.OS === 'web') {
                                const input = document.createElement('input');
                                input.type = 'file'; input.accept = 'image/*';
                                input.onchange = (e: any) => {
                                  const file = e.target.files?.[0]; if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const dataUrl = ev.target?.result as string;
                                    setQuestionPhotos(prev => prev.map((v, i) => i === qi ? { preview: dataUrl, base64: dataUrl.split(',')[1], mime: file.type } : v));
                                  };
                                  reader.readAsDataURL(file);
                                };
                                input.click();
                              }
                            }}
                            activeOpacity={0.8}>
                            <Feather name="camera" size={13} color={color} />
                            <Text style={{ fontSize: 11, color, fontWeight: '600' }}>Upload photo answer</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Submit button */}
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: color }]}
                onPress={() => setShowReview(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>Review & Submit</Text>
                <Feather name="check-square" size={16} color="#fff" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Legacy page-by-page mode (no extracted questions) ──
  return (
    <Modal visible animationType="slide" transparent onRequestClose={() => setShowConfirm(true)}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ModalTopBar
            title={assignment.title}
            subtitle={`Page ${step + 1} of ${totalSteps} · ${assignment.subject}`}
            color={color} colors={colors}
            icon={SUBJECT_ICON[assignment.subject] ?? 'book-open'}
            onBack={() => step === 0 ? setShowConfirm(true) : setStep(s => s - 1)}
          />
          <ConfirmCloseOverlay visible={showConfirm} color={color} colors={colors}
            onConfirm={onClose} onCancel={() => setShowConfirm(false)} />

          {/* Progress bar */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10, gap: 5 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View key={i} style={{
                flex: i === step ? 2 : 1, height: 5, borderRadius: 3,
                backgroundColor: i === step ? color : answers[i]?.base64 ? color + '70' : colors.borderColor,
              }} />
            ))}
            <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.borderColor }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Worksheet page image — full width */}
            {pageUrl ? (
              <WorksheetPageImage url={pageUrl} pageNum={step + 1} color={color} colors={colors} />
            ) : (
              <View style={{ gap: 10 }}>
                {assignment.note ? (
                  <View style={[styles.noteBox, { backgroundColor: color + '12', borderColor: color + '30' }]}>
                    <Feather name="info" size={14} color={color} />
                    <Text style={[styles.noteText, { color: colors.textMuted }]}>{assignment.note}</Text>
                  </View>
                ) : null}
                {(assignment.questions?.length ?? 0) === 0 && !assignment.note && (
                  <View style={{ padding: 16, borderRadius: 12, backgroundColor: colors.borderColor + '40', alignItems: 'center', gap: 6 }}>
                    <Feather name="file-text" size={28} color={colors.textDim} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMain }}>Complete this assignment on paper</Text>
                    <Text style={{ fontSize: 12, color: colors.textDim, textAlign: 'center' }}>Take a photo of your completed work and upload it below.</Text>
                  </View>
                )}
              </View>
            )}

            {/* Upload answer for this page */}
            <View style={styles.uploadSection}>
              <Text style={styles.sectionLabel}>Your Answer for Page {step + 1}</Text>
              <Text style={[styles.uploadHint, { color: colors.textDim }]}>
                Complete this page on paper, then take a clear photo of your answers.
              </Text>
              {currentAnswer.preview ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: currentAnswer.preview }} style={styles.photoPreview} resizeMode="contain" />
                  <TouchableOpacity style={styles.changePhotoBtn} onPress={() => pickPhoto(step)} activeOpacity={0.8}>
                    <Feather name="camera" size={13} color={color} />
                    <Text style={[styles.changePhotoText, { color }]}>Change photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadBtn, { borderColor: color + '60', backgroundColor: color + '08' }]}
                  onPress={() => pickPhoto(step)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.uploadIconCircle, { backgroundColor: color + '20' }]}>
                    <Feather name="camera" size={28} color={color} />
                  </View>
                  <Text style={[styles.uploadBtnTitle, { color: colors.textMain }]}>Upload Your Answer</Text>
                  <Text style={[styles.uploadBtnSub, { color: colors.textDim }]}>Take a clear photo of your written answers</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Navigation */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {step > 0 && (
                <TouchableOpacity
                  style={[styles.submitBtn, { flex: 1, backgroundColor: colors.borderColor }]}
                  onPress={() => setStep(s => s - 1)}
                  activeOpacity={0.85}
                >
                  <Feather name="chevron-left" size={16} color={colors.textMuted} />
                  <Text style={[styles.submitBtnText, { color: colors.textMuted }]}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.submitBtn, { flex: 2, backgroundColor: color }]}
                onPress={() => isLastStep ? setShowReview(true) : setStep(s => s + 1)}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>
                  {isLastStep ? 'Review & Submit' : 'Next Page'}
                </Text>
                <Feather name={isLastStep ? 'check-square' : 'chevron-right'} size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            {!currentAnswer.base64 && (
              <TouchableOpacity
                onPress={() => isLastStep ? setShowReview(true) : setStep(s => s + 1)}
                activeOpacity={0.7}
                style={{ alignSelf: 'center', paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 12, color: colors.textDim, textDecorationLine: 'underline' }}>
                  Skip this page
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
