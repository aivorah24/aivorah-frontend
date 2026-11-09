import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import {
  fetchWeeklyQuiz, checkQuizAnswer, submitQuiz, recordQuizComplete,
  type AgeGroup, type AnswerReveal, type Quiz, type QuizAnswer, type QuizCompleteResult, type QuizResult,
} from '../../../services/currentAffairsApi';
import {
  GOLD, SAGE, DEEP_SAGE, CORRECT, WRONG, TINT_BG, TITLE_LIGHT,
  QUESTION_TYPES, OPTION_LETTERS, EXCELLENCE_PERCENT, ageGroupForGrade,
} from './constants';
import CategoryBadge from './components/CategoryBadge';

export default function QuizScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { isMobile } = useResponsive();
  const styles = useMemo(() => makeStyles(colors, isMobile), [colors, isMobile]);
  const titleColor = isDark ? colors.textMain : TITLE_LIGHT;

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

  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator testID="quiz-loading" size="large" color={GOLD} />
      </View>
    );
  } else if (error || !quiz) {
    body = (
      <View style={styles.center}>
        <Feather name="wifi-off" size={28} color={colors.textDim} />
        <Text style={[styles.hint, { color: colors.textMuted }]}>{error}</Text>
        <TouchableOpacity style={[styles.outlineBtn, { borderColor: GOLD + '60' }]} onPress={load} accessibilityRole="button">
          <Feather name="refresh-cw" size={13} color={GOLD} />
          <Text style={[styles.outlineBtnText, { color: GOLD }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (result) {
    body = (
      <ResultView
        styles={styles} colors={colors} titleColor={titleColor} isDark={isDark}
        result={result} award={award} awardError={awardError}
        alreadyTaken={!!result.alreadySubmitted || (!!quiz.attempt && result === quiz.attempt)}
        onDone={goToDigest}
      />
    );
  } else if (questions.length === 0) {
    body = (
      <View style={[styles.emptyBox, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]} testID="quiz-empty">
        <View style={[styles.iconCircle, { backgroundColor: GOLD + '20' }]}>
          <Feather name="calendar" size={16} color={GOLD} />
        </View>
        <Text style={[styles.emptyTitle, { color: titleColor }]}>This week’s quiz isn’t ready yet</Text>
        <Text style={[styles.emptySub, { color: colors.textMuted }]}>A new quiz comes out every Sunday. Keep reading the daily stories!</Text>
        <TouchableOpacity style={[styles.outlineBtn, { borderColor: GOLD + '60' }]} onPress={goToDigest} accessibilityRole="button">
          <Feather name="arrow-left" size={13} color={GOLD} />
          <Text style={[styles.outlineBtnText, { color: GOLD }]}>Back to today’s stories</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (question) {
    body = (
      <>
        <View style={[styles.card, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
          <View style={styles.counterRow}>
            <Text style={[styles.counter, { color: colors.textMuted }]}>Question {index + 1} of {questions.length}</Text>
            <Text style={[styles.typeText, { color: GOLD }]}>{QUESTION_TYPES[question.type]}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.borderColor }]}>
            <View style={[styles.fill, { width: `${Math.round(((index + (reveal ? 1 : 0)) / questions.length) * 100)}%` }]} />
          </View>
          <CategoryBadge category={question.category} />
          <Text style={[styles.question, { color: titleColor }]}>{question.question}</Text>

          <View style={styles.options}>
            {question.options.map((option, i) => {
              const isChosen = selected === i;
              const isCorrect = !!reveal && reveal.correctIndex === i;
              const isWrongChoice = !!reveal && isChosen && !reveal.correct;
              let bg = isDark ? colors.bgDark : '#fff';
              let border = GOLD + '40';
              if (isCorrect) { bg = CORRECT + '18'; border = CORRECT + '80'; }
              else if (isWrongChoice) { bg = WRONG + '18'; border = WRONG + '80'; }
              else if (isChosen) { bg = GOLD + '18'; border = GOLD; }
              return (
                <TouchableOpacity
                  key={`${question.id}-${i}`}
                  testID={`option-${i}`}
                  disabled={!!reveal || busy}
                  onPress={() => setSelected(i)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isChosen, disabled: !!reveal }}
                  style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                >
                  <View style={[styles.optionIdx, { backgroundColor: (isChosen ? GOLD : GOLD + '20') }]}>
                    <Text style={[styles.optionIdxText, { color: isChosen ? '#fff' : GOLD }]}>{OPTION_LETTERS[i]}</Text>
                  </View>
                  <Text style={[styles.optionText, { color: titleColor }]}>{option}</Text>
                  {isCorrect ? <Feather name="check" size={14} color={CORRECT} /> : null}
                  {isWrongChoice ? <Feather name="x" size={14} color={WRONG} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {reveal ? (
          <View
            testID="answer-feedback"
            style={[styles.feedback, {
              backgroundColor: (reveal.correct ? CORRECT : WRONG) + '12',
              borderColor: (reveal.correct ? CORRECT : WRONG) + '35',
            }]}
          >
            <View style={styles.feedbackTop}>
              <Feather name={reveal.correct ? 'check-circle' : 'info'} size={15} color={reveal.correct ? CORRECT : WRONG} />
              <Text style={[styles.feedbackTitle, { color: reveal.correct ? CORRECT : WRONG }]}>
                {reveal.correct ? 'Correct!' : `Not quite — the answer is ${OPTION_LETTERS[reveal.correctIndex]}: ${question.options[reveal.correctIndex]}`}
              </Text>
            </View>
            <Text style={[styles.body, { color: colors.textMain }]}>{reveal.explanation}</Text>
            {reveal.extraFact ? (
              <Text style={[styles.body, { color: colors.textMain }]}>
                <Text style={styles.bold}>Did you know? </Text>{reveal.extraFact}
              </Text>
            ) : null}
            {reveal.storyId ? (
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => navigation.navigate('CurrentAffairsStory', { storyId: reveal.storyId, ageGroup })}
                accessibilityRole="link"
              >
                <Feather name="book-open" size={12} color={GOLD} />
                <Text style={[styles.link, { color: GOLD }]}>Read the story</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {actionError ? <Text style={[styles.hint, { color: colors.accentRed }]}>{actionError}</Text> : null}

        {!reveal ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: GOLD }, (selected === null || busy) && styles.disabled]}
            disabled={selected === null || busy}
            onPress={onCheck}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Check Answer</Text>}
          </TouchableOpacity>
        ) : isLast ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: GOLD }, busy && styles.disabled]}
            disabled={busy}
            onPress={onSubmit}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Submit Quiz</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: GOLD }]} onPress={onNext} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.primaryBtnText}>Next Question</Text>
            <Feather name="arrow-right" size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Weekly Quiz"
          subtitle="Current Affairs"
          showSearch={false}
          showBack
          onBack={goToDigest}
          onMenuPress={() => navigation.openDrawer?.()}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {body}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

function ResultView({ styles, colors, titleColor, isDark, result, award, awardError, alreadyTaken, onDone }: {
  styles: ReturnType<typeof makeStyles>;
  colors: AppColors;
  titleColor: string;
  isDark: boolean;
  result: QuizResult;
  award: QuizCompleteResult | null;
  awardError: string | null;
  alreadyTaken: boolean;
  onDone: () => void;
}) {
  const excellent = result.percentage >= EXCELLENCE_PERCENT;
  return (
    <View style={{ gap: spacing.md }} testID="quiz-result">
      <View style={[styles.card, styles.resultCard, {
        backgroundColor: isDark ? colors.cardDark : TINT_BG,
        borderColor: isDark ? colors.borderColor : GOLD + '25',
      }]}>
        <View style={[styles.bigIcon, { backgroundColor: GOLD + '20' }]}>
          <Feather name={excellent ? 'award' : 'check-circle'} size={22} color={GOLD} />
        </View>
        <Text style={[styles.score, { color: GOLD }]}>{result.score}/{result.total}</Text>
        <Text style={[styles.percent, { color: DEEP_SAGE }]}>{result.percentage}%</Text>
        {alreadyTaken ? <Text style={[styles.hint, { color: colors.textMuted }]}>You already took this week’s quiz — here is your result.</Text> : null}
        {award ? (
          <Text style={[styles.points, { color: GOLD }]}>
            {award.alreadyRecorded ? 'Points for this quiz were already added.' : `+${award.pointsAwarded} points`}
          </Text>
        ) : null}
        {awardError ? <Text style={[styles.hint, { color: colors.accentRed }]}>{awardError}</Text> : null}
        {excellent ? (
          <View style={[styles.pill, { backgroundColor: GOLD }]} testID="excellence-badge">
            <Feather name="award" size={13} color="#fff" />
            <Text style={styles.pillText}>Excellence badge — {EXCELLENCE_PERCENT}% or more!</Text>
          </View>
        ) : (
          <Text style={[styles.hint, { color: colors.textMuted }]}>Every week is a chance to learn more. Keep reading the daily stories!</Text>
        )}
        {award?.newBadges.includes('growth') ? (
          <View style={[styles.pill, { backgroundColor: SAGE + '25' }]}>
            <Feather name="trending-up" size={13} color={DEEP_SAGE} />
            <Text style={[styles.pillText, { color: DEEP_SAGE }]}>Growth badge — you beat your last score!</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.sectionTitle, { color: GOLD }]}>REVIEW YOUR ANSWERS</Text>
      {result.results.map((r, i) => (
        <View key={r.questionId} style={[styles.reviewItem, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
          <View style={styles.reviewHeader}>
            <Feather name={r.correct ? 'check-circle' : 'x-circle'} size={16} color={r.correct ? CORRECT : WRONG} />
            <Text style={[styles.reviewQuestion, { color: titleColor }]}>{i + 1}. {r.question}</Text>
          </View>
          <Text style={[styles.reviewText, { color: colors.textMain }]}>
            Your answer: {r.selected === null ? 'not answered' : `${OPTION_LETTERS[r.selected]}. ${r.options[r.selected]}`}
          </Text>
          {!r.correct ? (
            <Text style={[styles.reviewText, { color: CORRECT }]}>Correct answer: {OPTION_LETTERS[r.correctIndex]}. {r.options[r.correctIndex]}</Text>
          ) : null}
          <Text style={[styles.reviewExplain, { color: colors.textMuted }]}>{r.explanation}</Text>
        </View>
      ))}

      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: GOLD }]} onPress={onDone} activeOpacity={0.85} accessibilityRole="button">
        <Feather name="calendar" size={14} color="#fff" />
        <Text style={styles.primaryBtnText}>Try Again Next Week</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: AppColors, isMobile: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  content: { padding: isMobile ? spacing.lg : spacing.xl, paddingBottom: 56, gap: spacing.md },
  center: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  hint: { fontSize: 13, textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 21 },
  bold: { fontWeight: '800' },

  card: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { fontSize: 11, fontWeight: '600' },
  typeText: { fontSize: 11, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: GOLD },
  question: { fontSize: 15, fontWeight: '700', lineHeight: 22 },

  options: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  optionIdx: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  optionIdxText: { fontSize: 12, fontWeight: '800' },
  optionText: { flex: 1, fontSize: 14, fontWeight: '500' },

  feedback: { borderRadius: 12, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  feedbackTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedbackTitle: { flex: 1, fontSize: 14, fontWeight: '800' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  link: { fontSize: 13, fontWeight: '600' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, minHeight: 44,
  },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 10, borderWidth: 1,
  },
  outlineBtnText: { fontSize: 13, fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: spacing.lg, borderRadius: radius.xl, borderWidth: 1, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 300, lineHeight: 20 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  resultCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  bigIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 34, fontWeight: '800', fontFamily: fonts.serif },
  percent: { fontSize: 16, fontWeight: '700' },
  points: { fontSize: 15, fontWeight: '800' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 7 },
  pillText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: spacing.xs },
  reviewItem: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: 4 },
  reviewHeader: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  reviewQuestion: { flex: 1, fontSize: 14, fontWeight: '700' },
  reviewText: { fontSize: 13 },
  reviewExplain: { fontSize: 12, lineHeight: 18 },
});
