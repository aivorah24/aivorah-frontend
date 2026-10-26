/**
 * QuizScreen.tsx
 * Practice test for any topic — Grades 3, 4, 5
 * - Generates mixed MCQ + fill-in-the-blank questions via Groq (/ibpyp/quiz)
 * - MCQ wrong → hint available → retry (up to 2 attempts) → explanation
 * - Fill-blank: 3-attempt nudge logic (wrong1 → retry, wrong2 → hint, wrong3 → reveal)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';
import { useStudentData } from '../../../../context/StudentDataContext';
import ScreenLayout from '../../../../components/common/ScreenLayout';

import { makeStyles } from './styles';
import { useQuiz } from './hooks/useQuiz';
import QuizResult from './components/QuizResult';
import { useNextTopic } from './hooks/useNextTopic';
import QuizQuestion from './components/QuizQuestion';

// The drawer keeps this screen mounted, so coming back would show the last test's
// questions/results. Each new visit gets a fresh session (new questions).
export default function QuizScreen({ navigation, route }: any) {
  const [visit, setVisit] = useState(0);
  const left = useRef(false);
  useEffect(() => {
    const offBlur = navigation.addListener?.('blur', () => { left.current = true; });
    const offFocus = navigation.addListener?.('focus', () => {
      if (!left.current) return;
      left.current = false;
      setVisit(v => v + 1);
    });
    return () => { offBlur?.(); offFocus?.(); };
  }, [navigation]);
  return <QuizSession key={visit} navigation={navigation} route={route} />;
}

function QuizSession({ navigation, route }: any) {
  const { topic, grade = 'Grade 3', subject = 'Mathematics', curriculum = 'IB PYP', returnTo, returnParams, passageText, topicId, practiceQuiz } = route?.params ?? {};
  // Whoever launched this quiz — SubjectTopics by default, but LessonScreen's
  // Practice tab passes its own returnTo/returnParams so back lands there
  // instead of always dumping the student back on the topic list.
  // Drawer uses backBehavior="history": navigate() would push the origin on top
  // of Quiz, so the origin's own back button would reopen these results.
  const goBackToOrigin = () => {
    const target = returnTo ?? 'SubjectTopics';
    const state = navigation.getState?.();
    const history = (state?.history ?? []).filter((h: any) => h.type === 'route');
    const prevKey = history[history.length - 2]?.key;
    const prevName = state?.routes?.find((r: any) => r.key === prevKey)?.name;
    if (prevName === target) navigation.goBack();
    else if (returnTo) navigation.navigate(returnTo, returnParams);
    else navigation.navigate('SubjectTopics', { subject, grade, curriculum });
  };
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { studentId, completeLesson, addXP, recordStudySeconds, recordQuizResult } = useStudentData();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const accent = colors.accentYellow;

  const quiz = useQuiz({
    topic, grade, subject, curriculum, passageText, topicId, practiceQuiz,
    // B004 fix: track-attempt needs the real resolved student id
    // (StudentDataContext.studentId, from POST /user/sync), not AuthContext's
    // user.id — that field is never populated on the real user object, which
    // silently skipped every attempt POST (score/XP still showed correctly
    // via completeLesson(), which already used the right id).
    userEmail: user?.email, userRole: user?.role, studentId,
    navigation, completeLesson, addXP, recordStudySeconds, recordQuizResult,
  });

  const nextTopic = useNextTopic(subject, curriculum, grade, topic);

  // ── Loading ────────────────────────────────────────────────────
  if (quiz.phase === 'loading') return (
    <ScreenLayout>
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Preparing your practice test…</Text>
      </View>
    </ScreenLayout>
  );

  // ── Results ────────────────────────────────────────────────────
  if (quiz.phase === 'result') {
    return (
      <QuizResult
        topic={topic}
        score={quiz.score}
        questions={quiz.questions}
        perQuestionResults={quiz.perQuestionResultsRef.current}
        resultExplanations={quiz.resultExplanations}
        explanationsRef={quiz.explanationsRef}
        attemptNumber={quiz.attemptNumber}
        quizStartTime={quiz.quizStartTimeRef.current}
        colors={colors}
        isDark={isDark}
        styles={styles}
        onRetry={() => quiz.fetchQuiz(true)}
        onBack={goBackToOrigin}
        onMenuPress={() => navigation.openDrawer()}
        nextTopic={nextTopic.next}
        nextTopicLoading={nextTopic.loading}
        onNextTopic={(next) => navigation.navigate('LessonScreen', next.params)}
      />
    );
  }

  // ── Quiz ───────────────────────────────────────────────────────
  const q = quiz.questions[quiz.currentQ];

  return (
    <QuizQuestion
      q={q}
      currentQ={quiz.currentQ}
      questions={quiz.questions}
      topic={topic}
      subject={subject}
      colors={colors}
      isDark={isDark}
      styles={styles}
      mcqSelected={quiz.mcqSelected}
      mcqDone={quiz.mcqDone}
      showMcqHint={quiz.showMcqHint}
      fillInput={quiz.fillInput}
      setFillInput={quiz.setFillInput}
      fillFeedback={quiz.fillFeedback}
      fillValidating={quiz.fillValidating}
      explanation={quiz.explanation}
      loadingExplain={quiz.loadingExplain}
      onMcqAnswer={quiz.handleMcqAnswer}
      onFillSubmit={quiz.handleFillSubmit}
      onNext={quiz.goNext}
      onPrev={quiz.goPrev}
      onBack={goBackToOrigin}
      onMenuPress={() => navigation.openDrawer()}
    />
  );
}
