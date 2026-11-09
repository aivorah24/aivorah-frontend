import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { spacing, radius } from '../../../theme';
import type { AppColors } from '../../../theme';
import {
  fetchWeeklyQuiz, checkQuizAnswer, submitQuiz, recordQuizComplete,
  type AgeGroup, type AnswerReveal, type Quiz, type QuizAnswer, type QuizCompleteResult, type QuizResult,
} from '../../../services/currentAffairsApi';
import {
  BRAND, PASTEL, CATEGORIES, QUESTION_TYPES, OPTION_LETTERS, EXCELLENCE_PERCENT, ageGroupForGrade, categoryColors,
} from './constants';

export default function QuizScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { isMobile } = useResponsive();
  const styles = useMemo(() => makeStyles(colors, isMobile), [colors, isMobile]);

  const ageGroup: AgeGroup = route?.params?.ageGroup || ageGroupForGrade(user?.grade);
  const email = user?.email || undefined;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [reveal, setReveal] = useState<AnswerReveal | null>(null);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [result, setResult] = useState<QuizResult | null>(null);
  const [award, setAward] = useState<QuizCompleteResult | null>(null);
  const [awardError, setAwardError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = await fetchWeeklyQuiz(ageGroup, email);
      setQuiz(q);
      // Already taken this week → straight to the result.
      setResult(q.attempt);
      setIndex(0); setSelected(null); setReveal(null); setAnswers([]); setAward(null); setAwardError(null);
    } catch (e: any) {
      setError(e?.message || "Could not load this week's quiz");
    } finally {
      setLoading(false);
    }
  }, [ageGroup, email]);

  // Reload only when nothing is in progress (coming back from a story mid-quiz keeps the answers).
  useFocusEffect(useCallback(() => {
    if (!quiz) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keep an in-progress quiz on refocus
  }, [load]));

  const questions = quiz?.questions || [];
  const question = questions[index];
  const isLast = index === questions.length - 1;
  const goToDigest = () => navigation.navigate('CurrentAffairs');

  const onCheck = async () => {
    if (selected === null || !question) return;
    setBusy(true);
    setActionError(null);
    try {
      setReveal(await checkQuizAnswer(question.id, selected));
      setAnswers((prev) => [...prev.filter((a) => a.questionId !== question.id), { questionId: question.id, answer: selected }]);
    } catch (e: any) {
      setActionError(e?.message || 'Could not check the answer');
    } finally {
      setBusy(false);
    }
  };

  const onNext = () => {
    setIndex((i) => i + 1);
    setSelected(null);
    setReveal(null);
    setActionError(null);
  };

  const onSubmit = async () => {
    if (!email || !quiz) { setActionError('Please sign in to submit the quiz.'); return; }
    setBusy(true);
    setActionError(null);
    try {
      const graded = await submitQuiz(email, ageGroup, answers, quiz.weekStart);
      setResult(graded);
      try {
        setAward(await recordQuizComplete(email, ageGroup, graded.attemptId));
      } catch (e: any) {
        setAwardError(e?.message || 'Could not save your quiz points');
      }
    } catch (e: any) {
      setActionError(e?.message || 'Could not submit the quiz');
    } finally {
      setBusy(false);
    }
  };

  const header = <Header title="Weekly Quiz" subtitle="Current Affairs" showSearch={false} showBack onBack={goToDigest} onMenuPress={goToDigest} />;

  if (loading) {
    return (
      <ScreenLayout>
        <View style={styles.screen}>
          {header}
          <View style={styles.center}><ActivityIndicator testID="quiz-loading" size="large" color={BRAND.gold} /></View>
        </View>
      </ScreenLayout>
    );
  }

  if (error || !quiz) {
    return (
      <ScreenLayout>
        <View style={styles.screen}>
          {header}
          <View style={styles.center}>
            <Feather name="wifi-off" size={36} color={colors.textMuted} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={load} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          {result ? (
            <ResultView
              styles={styles} result={result} award={award} awardError={awardError}
              alreadyTaken={!!result.alreadySubmitted || (!!quiz.attempt && result === quiz.attempt)}
              onDone={goToDigest}
            />
          ) : questions.length === 0 ? (
            <View style={styles.emptyCard} testID="quiz-empty">
              <Text style={styles.bigEmoji}>🗓️</Text>
              <Text style={styles.emptyTitle}>This week’s quiz isn’t ready yet</Text>
              <Text style={styles.muted}>A new quiz comes out every Sunday. Keep reading the daily stories!</Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={goToDigest} accessibilityRole="button">
                <Text style={styles.secondaryButtonText}>Back to today’s stories</Text>
              </TouchableOpacity>
            </View>
          ) : question ? (
            <>
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>Question {index + 1} of {questions.length}</Text>
                <Text style={styles.typeText}>{QUESTION_TYPES[question.type]}</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.round(((index + (reveal ? 1 : 0)) / questions.length) * 100)}%` }]} />
              </View>

              <View style={styles.card}>
                <View style={[styles.badge, { backgroundColor: categoryColors(question.category, isDark).bg }]}>
                  <Text style={[styles.badgeText, { color: categoryColors(question.category, isDark).fg }]}>
                    {CATEGORIES[question.category]?.emoji} {CATEGORIES[question.category]?.label}
                  </Text>
                </View>
                <Text style={styles.question}>{question.question}</Text>

                {question.options.map((option, i) => {
                  const isChosen = selected === i;
                  const isCorrect = reveal && reveal.correctIndex === i;
                  const isWrongChoice = reveal && isChosen && !reveal.correct;
                  return (
                    <TouchableOpacity
                      key={`${question.id}-${i}`}
                      testID={`option-${i}`}
                      disabled={!!reveal || busy}
                      onPress={() => setSelected(i)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isChosen, disabled: !!reveal }}
                      style={[
                        styles.option,
                        isChosen && styles.optionChosen,
                        isCorrect && styles.optionCorrect,
                        isWrongChoice && styles.optionWrong,
                      ]}
                    >
                      <View style={[styles.letter, isChosen && styles.letterChosen, isCorrect && styles.letterCorrect, isWrongChoice && styles.letterWrong]}>
                        <Text style={[styles.letterText, (isChosen || isCorrect) && styles.letterTextOn]}>{OPTION_LETTERS[i]}</Text>
                      </View>
                      <Text style={styles.optionText}>{option}</Text>
                      {isCorrect ? <Feather name="check-circle" size={20} color={BRAND.forest} /> : null}
                      {isWrongChoice ? <Feather name="x-circle" size={20} color={BRAND.rose} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {reveal ? (
                <View style={[styles.feedback, { backgroundColor: isDark ? `${reveal.correct ? BRAND.forest : BRAND.rose}26` : reveal.correct ? PASTEL.forest : PASTEL.rose }]} testID="answer-feedback">
                  <Text style={[styles.feedbackTitle, { color: reveal.correct ? BRAND.forest : BRAND.rose }]}>
                    {reveal.correct ? '🎉 Correct!' : `Not quite — the answer is ${OPTION_LETTERS[reveal.correctIndex]}: ${question.options[reveal.correctIndex]}`}
                  </Text>
                  <Text style={styles.body}>{reveal.explanation}</Text>
                  {reveal.extraFact ? <Text style={styles.body}><Text style={styles.bold}>Did you know? </Text>{reveal.extraFact}</Text> : null}
                  {reveal.storyId ? (
                    <TouchableOpacity onPress={() => navigation.navigate('CurrentAffairsStory', { storyId: reveal.storyId, ageGroup })} accessibilityRole="link">
                      <Text style={styles.link}>Read the story</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

              {!reveal ? (
                <TouchableOpacity
                  style={[styles.primaryButton, (selected === null || busy) && styles.disabled]}
                  disabled={selected === null || busy}
                  onPress={onCheck}
                  accessibilityRole="button"
                >
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Check Answer</Text>}
                </TouchableOpacity>
              ) : isLast ? (
                <TouchableOpacity style={[styles.primaryButton, busy && styles.disabled]} disabled={busy} onPress={onSubmit} accessibilityRole="button">
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Submit Quiz</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.primaryButton} onPress={onNext} accessibilityRole="button">
                  <Text style={styles.primaryButtonText}>Next Question</Text>
                </TouchableOpacity>
              )}
            </>
          ) : null}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

function ResultView({ styles, result, award, awardError, alreadyTaken, onDone }: {
  styles: ReturnType<typeof makeStyles>;
  result: QuizResult;
  award: QuizCompleteResult | null;
  awardError: string | null;
  alreadyTaken: boolean;
  onDone: () => void;
}) {
  const excellent = result.percentage >= EXCELLENCE_PERCENT;
  return (
    <View style={{ gap: spacing.md }} testID="quiz-result">
      <View style={styles.resultCard}>
        <Text style={styles.bigEmoji}>{excellent ? '🏅' : result.percentage >= 50 ? '🌟' : '💪'}</Text>
        <Text style={styles.score}>{result.score}/{result.total}</Text>
        <Text style={styles.percent}>{result.percentage}%</Text>
        {alreadyTaken ? <Text style={styles.muted}>You already took this week’s quiz — here is your result.</Text> : null}
        {award ? (
          <Text style={styles.points}>
            {award.alreadyRecorded ? 'Points for this quiz were already added.' : `+${award.pointsAwarded} points`}
          </Text>
        ) : null}
        {awardError ? <Text style={styles.errorText}>{awardError}</Text> : null}
        {excellent ? (
          <View style={styles.excellence} testID="excellence-badge">
            <Feather name="award" size={18} color="#fff" />
            <Text style={styles.excellenceText}>Excellence badge — {EXCELLENCE_PERCENT}% or more!</Text>
          </View>
        ) : (
          <Text style={styles.muted}>Every week is a chance to learn more. Keep reading the daily stories!</Text>
        )}
        {award?.newBadges.includes('growth') ? <Text style={styles.growth}>📈 Growth badge — you beat your last score!</Text> : null}
      </View>

      <Text style={styles.reviewTitle}>Review your answers</Text>
      {result.results.map((r, i) => (
        <View key={r.questionId} style={styles.reviewItem}>
          <View style={styles.reviewHeader}>
            <Feather name={r.correct ? 'check-circle' : 'x-circle'} size={18} color={r.correct ? BRAND.forest : BRAND.rose} />
            <Text style={styles.reviewQuestion}>{i + 1}. {r.question}</Text>
          </View>
          <Text style={styles.body}>
            Your answer: {r.selected === null ? 'not answered' : `${OPTION_LETTERS[r.selected]}. ${r.options[r.selected]}`}
          </Text>
          {!r.correct ? <Text style={styles.body}>Correct answer: {OPTION_LETTERS[r.correctIndex]}. {r.options[r.correctIndex]}</Text> : null}
          <Text style={styles.muted}>{r.explanation}</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.primaryButton} onPress={onDone} accessibilityRole="button">
        <Text style={styles.primaryButtonText}>Try Again Next Week</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: AppColors, isMobile: boolean) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    content: { padding: isMobile ? spacing.lg : spacing.xxl, paddingBottom: spacing.xxxl * 2, gap: spacing.md, maxWidth: 760, width: '100%', alignSelf: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
    muted: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
    body: { color: colors.textMain, fontSize: 15, lineHeight: 22 },
    bold: { fontWeight: '800' },
    link: { color: BRAND.blue, fontSize: 14, textDecorationLine: 'underline' },
    errorText: { color: BRAND.rose, fontSize: 14, textAlign: 'center' },

    progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
    progressText: { color: colors.textHeading, fontWeight: '700', fontSize: 15 },
    typeText: { color: colors.textMuted, fontSize: 13 },
    barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.borderColor, overflow: 'hidden' },
    barFill: { height: 8, borderRadius: 4, backgroundColor: BRAND.purple },

    card: { backgroundColor: colors.cardDark, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.borderColor, gap: spacing.md },
    badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
    badgeText: { fontSize: 12, fontWeight: '700' },
    question: { color: colors.textHeading, fontSize: 19, fontWeight: '700', lineHeight: 26 },

    option: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
      borderRadius: radius.md, borderWidth: 2, borderColor: colors.borderColor, minHeight: 52,
    },
    optionChosen: { borderColor: BRAND.purple },
    optionCorrect: { borderColor: BRAND.forest },
    optionWrong: { borderColor: BRAND.rose },
    letter: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.textDim, alignItems: 'center', justifyContent: 'center' },
    letterChosen: { backgroundColor: BRAND.purple, borderColor: BRAND.purple },
    letterCorrect: { backgroundColor: BRAND.forest, borderColor: BRAND.forest },
    letterWrong: { backgroundColor: BRAND.rose, borderColor: BRAND.rose },
    letterText: { color: colors.textMuted, fontWeight: '800' },
    letterTextOn: { color: '#fff' },
    optionText: { flex: 1, color: colors.textMain, fontSize: 16 },

    feedback: { borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
    feedbackTitle: { fontSize: 16, fontWeight: '800' },

    primaryButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
      backgroundColor: BRAND.gold, borderRadius: radius.md, paddingVertical: spacing.md, minHeight: 48,
    },
    primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    disabled: { opacity: 0.5 },
    secondaryButton: { borderWidth: 1, borderColor: BRAND.gold, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
    secondaryButtonText: { color: BRAND.gold, fontWeight: '700' },

    emptyCard: { alignItems: 'center', padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.cardDark, borderRadius: radius.lg },
    emptyTitle: { color: colors.textHeading, fontSize: 18, fontWeight: '700', textAlign: 'center' },
    bigEmoji: { fontSize: 44 },

    resultCard: { alignItems: 'center', gap: spacing.sm, padding: spacing.xxl, backgroundColor: colors.cardDark, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderColor },
    score: { color: colors.textHeading, fontSize: 40, fontWeight: '800' },
    percent: { color: BRAND.purple, fontSize: 20, fontWeight: '700' },
    points: { color: BRAND.gold, fontSize: 18, fontWeight: '800' },
    excellence: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: BRAND.gold, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    excellenceText: { color: '#fff', fontWeight: '800' },
    growth: { color: BRAND.forest, fontWeight: '700' },

    reviewTitle: { color: colors.textHeading, fontSize: 17, fontWeight: '700', marginTop: spacing.sm },
    reviewItem: { backgroundColor: colors.cardDark, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs, borderWidth: 1, borderColor: colors.borderColor },
    reviewHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
    reviewQuestion: { flex: 1, color: colors.textHeading, fontWeight: '700', fontSize: 15 },
  });
}
