import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform } from 'react-native';
import { fonts, radius, spacing } from '../../../theme';
import type { AppColors } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useStudentData } from '../../../context/StudentDataContext';
import { useAuth } from '../../../context/AuthContext';

import { useChallengesList } from './hooks/useChallengesList';
import { useQuizSession } from './hooks/useQuizSession';

import StatsRow from './components/StatsRow';
import LeaderboardCTA from './components/LeaderboardCTA';
import ChallengeTabs from './components/ChallengeTabs';
import ChallengesGrid from './components/ChallengesGrid';
import QuizModal from './components/QuizModal';

export default function ChallengesScreen({ navigation, route }: any) {
  const highlightId = route?.params?.highlightId;
  const initialTab = route?.params?.tab;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { stats, studentId, completeChallenge, recordStudySeconds } = useStudentData();
  const { user, refreshProfile } = useAuth();

  const grade = user?.grade || 'Grade 3';
  const curriculum = user?.curriculum || 'IB PYP';

  const {
    activeTab, setActiveTab,
    challenges, setChallenges,
    loading, refreshing,
    fetchChallenges,
    filtered, counts,
  } = useChallengesList({ grade, curriculum, studentId, initialTab, refreshProfile });

  const {
    quizVisible, activeChallenge, questions, answers, setAnswers,
    quizLoading, quizSubmitting, quizResult, timeLeft,
    leaderboard, leaderLoading, allAnswered,
    startChallenge, submitQuiz, closeQuiz,
  } = useQuizSession({
    studentId,
    grade,
    userEmail: user?.email,
    completeChallenge,
    recordStudySeconds,
    onChallengeCompleted: (challengeId, score, xpAwarded) => {
      setChallenges(prev => prev.map(c =>
        c.id === challengeId ? { ...c, status: 'completed', score, xpAwarded } : c
      ));
    },
  });

  // Deep-link open: when arriving from a notification or the Schedule (both pass
  // highlightId), open the matching challenge the instant it's available — opens
  // immediately if the list is already loaded (no flash), otherwise as soon as it
  // arrives. Clearing the param prevents reopening on refocus.
  useEffect(() => {
    if (!highlightId) return;
    const target = challenges.find(c =>
      c.id === highlightId || (c as any).assignmentId === highlightId
    );
    if (target) {
      startChallenge(target);
      navigation.setParams?.({ highlightId: undefined });
    }
  }, [highlightId, challenges]);

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title="Challenges" onMenuPress={() => navigation.openDrawer()} />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchChallenges(true)} tintColor={colors.accentYellow} />}
        >
          <StatsRow stats={stats} styles={styles} colors={colors} />

          <LeaderboardCTA onPress={() => navigation.navigate('Leaderboard')} styles={styles} colors={colors} />

          <ChallengeTabs activeTab={activeTab} setActiveTab={setActiveTab} counts={counts} styles={styles} colors={colors} />

          <ChallengesGrid
            loading={loading}
            filtered={filtered}
            activeTab={activeTab}
            onStart={startChallenge}
            styles={styles}
            colors={colors}
          />
        </ScrollView>

        <QuizModal
          visible={quizVisible}
          activeChallenge={activeChallenge}
          questions={questions}
          answers={answers}
          setAnswers={setAnswers}
          quizLoading={quizLoading}
          quizSubmitting={quizSubmitting}
          quizResult={quizResult}
          timeLeft={timeLeft}
          allAnswered={allAnswered}
          leaderboard={leaderboard}
          leaderLoading={leaderLoading}
          studentId={studentId}
          grade={grade}
          onSubmit={submitQuiz}
          onClose={closeQuiz}
          styles={styles}
          colors={colors}
        />
      </View>
    </ScreenLayout>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  screen:       { flex: 1, backgroundColor: c.bgDark },
  content:      { padding: spacing.xl, paddingBottom: 40, gap: spacing.lg },

  statsRow:     { flexDirection: 'row', gap: spacing.sm },
  statCard:     { flex: 1, backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.lg, padding: spacing.sm, alignItems: 'center', gap: 3 },
  statValue:    { fontSize: 16, fontWeight: '800', letterSpacing: -0.5 },
  statLabel:    { fontSize: 9, color: c.textDim, textAlign: 'center', fontWeight: '500' },

  leaderCTA:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.xl, padding: spacing.lg },
  leaderCTAText:{ flex: 1, fontSize: 14, fontWeight: '700' },

  tabRow:       { flexDirection: 'row', gap: spacing.sm },
  tab:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.cardDark },
  tabActive:    { backgroundColor: c.accentYellow, borderColor: c.accentYellow },
  tabText:      { fontSize: 12, fontWeight: '600', color: c.textMuted },
  tabTextActive:{ color: 'white' },
  tabBadge:     { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeText: { fontSize: 10, fontWeight: '700' },

  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  challengeCard:     { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, overflow: 'hidden', flexBasis: '47%', flexGrow: 0 },
  cardImageWrap:     { position: 'relative', width: '100%', height: 160 },
  cardImage:         { width: '100%', height: 160 },
  cardScrim:         { position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, backgroundColor: 'rgba(0,0,0,0.55)' },
  diffPill:          { position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  diffPillText:      { fontSize: 10, fontWeight: '700', color: '#fff' },
  rankBadgeWrap:   { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 28, borderWidth: 2, overflow: 'hidden', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.55, shadowRadius: 10, elevation: 10 },
  rankBadgeShine:  { position: 'absolute', top: 0, left: 0, right: 0, height: '55%', backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 28 },
  rankBadgeEmoji:  { fontSize: 22 },
  rankBadgeLabel:  { fontSize: 13, fontWeight: '900', letterSpacing: 0.2 },
  rankBadgeSub:    { fontSize: 10, fontWeight: '700', marginTop: -1 },
  cardOverlay:       { position: 'absolute', bottom: 10, left: 10, right: 10 },
  cardOverlayTitle:  { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 4 },
  cardOverlayMeta:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardOverlayXP:     { fontSize: 11, fontWeight: '700', color: '#fbbf24' },
  cardOverlayDot:    { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  cardOverlayTime:   { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  completedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: spacing.lg },
  completedText:{ fontSize: 12, fontWeight: '700' },
  startBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginHorizontal: spacing.md, marginVertical: spacing.sm, borderRadius: radius.md },
  startBtnText: { fontSize: 13, fontWeight: '700', color: 'white' },

  emptyState:   { alignItems: 'center', paddingVertical: 40, gap: spacing.md },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: c.textMain },
  emptyText:    { fontSize: 13, color: c.textDim, textAlign: 'center' },

  // Quiz modal
  quizOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  quizSheet:    { backgroundColor: c.cardDark, borderRadius: 20, width: '100%', maxWidth: 720, maxHeight: '92%', borderWidth: 1, borderColor: c.borderColor },
  quizLoading:  { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  quizLoadingText: { fontSize: 14, color: c.textMuted },
  questionsContent: { padding: spacing.xl, gap: spacing.xl, paddingBottom: 40 },
  questionBlock:{ gap: spacing.md },
  questionNum:  { fontSize: 11, fontWeight: '700', color: c.textDim, textTransform: 'uppercase', letterSpacing: 0.5 },
  questionText: { fontSize: 15, fontWeight: '600', color: c.textMain, lineHeight: 22 },
  optionsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  textAnswerInput: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, fontSize: 14, marginTop: 4, textAlignVertical: 'top' },
  optionBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.bgDark, flexBasis: '48%', flexGrow: 1 },
  optionDot:    { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: c.textDim },
  optionText:   { fontSize: 14, color: c.textMuted, flex: 1 },
  submitQuizBtn:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.accentYellow, paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.md },
  submitQuizBtnText: { fontSize: 15, fontWeight: '700', color: 'white' },
  answerAllHint:{ fontSize: 12, color: c.textDim, textAlign: 'center', marginTop: spacing.sm },
  // Result
  resultBox:    { alignItems: 'center', padding: spacing.xxl, gap: spacing.lg, paddingBottom: 40, maxWidth: 600, alignSelf: 'center', width: '100%' },
  resultCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  resultScore:  { fontSize: 32, fontWeight: '900' },
  resultLabel:  { fontSize: 12, color: c.textDim, fontWeight: '600' },
  resultTitle:  { fontSize: 22, fontWeight: '800', color: c.textMain, fontFamily: fonts.serif },
  xpEarned:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  xpEarnedText: { fontSize: 18, fontWeight: '800' },
  doneBtn:      { backgroundColor: c.accentYellow, paddingHorizontal: 48, paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.sm },
  doneBtnText:  { fontSize: 15, fontWeight: '700', color: 'white' },

  // Leaderboard in result
  lbSection:    { alignSelf: 'stretch', gap: spacing.sm, backgroundColor: c.cardHover, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: c.borderColor },
  lbHeader:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  lbTitle:      { flex: 1, fontSize: 14, fontWeight: '700', color: c.textMain },
  liveBadge2:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot2:     { width: 6, height: 6, borderRadius: 3 },
  liveText2:    { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  scoreBandBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1.5, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: 10, marginBottom: spacing.sm, alignSelf: 'center', overflow: 'hidden' },
  scoreBandLabel:  { fontSize: 15, fontWeight: '900', letterSpacing: -0.3, fontFamily: fonts.serif },
  scoreBandSub:    { fontSize: 11, fontWeight: '600', marginTop: 1 },
  rankBandBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1.5, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: 10, marginBottom: 4, alignSelf: 'center' },
  rankBandLabel:  { fontSize: 15, fontWeight: '900', letterSpacing: -0.3, fontFamily: fonts.serif },
  rankBandSub:    { fontSize: 11, marginTop: 2 },
  myRankBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, alignSelf: 'center' },
  myRankText:   { fontSize: 13, fontWeight: '800' },
  lbRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, padding: spacing.sm },
  lbMedal:      { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  lbAvatar:     { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  lbAvatarText: { fontSize: 12, fontWeight: '700' },
  lbName:       { fontSize: 13, fontWeight: '600', color: c.textMain },
  lbMeta:       { fontSize: 10, color: c.textDim, marginTop: 1 },
  lbXP:         { fontSize: 14, fontWeight: '800' },
  lbXPLabel:    { fontSize: 9, color: c.textDim, fontWeight: '600' },
  lbEmpty:      { fontSize: 12, color: c.textDim, textAlign: 'center', paddingVertical: spacing.md },
  youChip:      { backgroundColor: c.accentYellow + '15', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  youChipText:  { fontSize: 9, fontWeight: '800' },
});
