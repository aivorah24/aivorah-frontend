import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, RefreshControl, StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { spacing, radius, fonts } from '../../../theme';
import { TEAL } from './constants';
import { useDailyHabits } from './hooks/useDailyHabits';
import HabitStatsRow from './components/HabitStatsRow';
import HabitProgressCard from './components/HabitProgressCard';
import HabitGrid from './components/HabitGrid';
import HabitJournalCard from './components/HabitJournalCard';
import MotivationFooter from './components/MotivationFooter';

export default function DailyHabitsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data, loading, error, refreshing, checking, coinPop, toggleHabit, onRefresh } = useDailyHabits();

  const parentTasks    = data?.parentTasks ?? [];
  const completed      = data?.today?.completed ?? [];
  const completedCount = completed.length;
  const totalHabits    = parentTasks.length;
  const allDone        = totalHabits > 0 && completedCount === totalHabits;
  const progressPct    = totalHabits > 0 ? completedCount / totalHabits : 0;

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Daily Habits"
          subtitle="Build your best self, one day at a time"
          showBack={true}
          onMenuPress={() => navigation.openDrawer()}
          showSearch={false}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
        >
          {loading && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={TEAL} />
            </View>
          )}

          {!loading && !!error && (
            <View style={styles.center}>
              <Feather name="alert-circle" size={28} color={colors.accentRed} />
              <Text style={[styles.errorHint, { color: colors.textMuted }]}>{error}</Text>
            </View>
          )}

          {!loading && !error && data && (
            <>
              <HabitStatsRow
                streak={data.streak}
                totalCoins={data.totalCoins}
                completedCount={completedCount}
                totalHabits={totalHabits}
                textMuted={colors.textMuted}
                styles={styles}
              />

              <HabitProgressCard
                allDone={allDone}
                completedCount={completedCount}
                totalHabits={totalHabits}
                coinsEarned={data.today?.coinsEarned ?? 0}
                progressPct={progressPct}
                streak={data.streak}
                streakBonus={data.streakBonus}
                cardDark={colors.cardDark}
                borderColor={colors.borderColor}
                textMain={colors.textMain}
                styles={styles}
              />

              <Text style={[styles.sectionTitle, { color: '#BAA467' }]}>TODAY&apos;S HABITS</Text>

              <HabitGrid
                tasks={parentTasks}
                completed={completed}
                checking={checking}
                coinPop={coinPop}
                onToggle={toggleHabit}
                cardDark={colors.cardDark}
                textMain={colors.textMain}
                textMuted={colors.textMuted}
                textDim={colors.textDim}
                emptyBorderColor={colors.borderColor}
                styles={styles}
              />

              <HabitJournalCard
                journalText={data.journalText}
                cardDark={colors.cardDark}
                borderColor={colors.borderColor}
                textMain={colors.textMain}
                textMuted={colors.textMuted}
                textDim={colors.textDim}
                styles={styles}
              />

              <MotivationFooter streak={data.streak} textMuted={colors.textMuted} styles={styles} />
            </>
          )}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

const makeStyles = (c: any) => StyleSheet.create({
  screen:  { flex: 1, backgroundColor: c.bgDark },
  content: { padding: spacing.lg, paddingBottom: 48, gap: spacing.md },
  center:  { alignItems: 'center', paddingVertical: 60, gap: 10 },
  errorHint: { fontSize: 13, textAlign: 'center' },

  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.lg,
    borderRadius: radius.xl, borderWidth: 1, gap: 4,
  },
  statNum:   { fontSize: 22, fontWeight: '800', fontFamily: fonts.serif },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  progressCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  progressTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle:{ fontSize: 13, fontWeight: '700' },
  progressCoins:{ fontSize: 13, fontWeight: '800' },
  progressTrack:{ height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  streakMilestone: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  streakMilestoneText: { fontSize: 12, fontWeight: '600' },

  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },

  habitGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  habitCard: {
    width: '48.5%',
    borderRadius: radius.md, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  habitCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  habitIcon:    { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  habitLabel:   { fontSize: 12, lineHeight: 16, flex: 1 },
  habitCoinsRow:{ flexDirection: 'row', alignItems: 'center', gap: 2 },
  habitCoins:   { fontSize: 10, fontWeight: '700' },
  coinPop: {
    position: 'absolute', right: 8, top: -8,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
  },
  coinPopText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },

  journalCard: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  journalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  journalIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  journalTitle: { fontSize: 14, fontWeight: '700' },
  journalSub:   { fontSize: 11, marginTop: 1 },
  journalBody:  { borderTopWidth: 1, padding: spacing.lg },
  journalText:  { fontSize: 14, lineHeight: 24 },

  motivationCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1,
  },
  motivationText: { flex: 1, fontSize: 13, lineHeight: 20 },

  emptyBox: {
    alignItems: 'center', paddingVertical: 48,
    borderRadius: radius.xl, borderWidth: 1, gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
});
