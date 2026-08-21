/**
 * WorldAndYouScreen.tsx
 * "The World & You" — GK facts, On This Day, Current Affairs
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useStudentData } from '../../../context/StudentDataContext';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { spacing, radius } from '../../../theme';
import type { AppColors } from '../../../theme';

import { useWorldData } from './hooks/useWorldData';
import DailyTidbitCard from './components/DailyTidbitCard';
import OnThisDayCard from './components/OnThisDayCard';
import BrainTeaserCard from './components/BrainTeaserCard';
import { TEAL } from './constants';

export default function WorldAndYouScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user }           = useAuth();
  const { studentId }      = useStudentData();
  const styles             = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const grade = user?.grade || 'Grade 3';
  const { loading, worldData, showAnswer, setShowAnswer, error } = useWorldData(grade);
  // On This Day / Brain Teaser are general-knowledge/trivia content — they
  // belong conceptually with the GK Fact tab above, not Current Affairs
  // (real news). Tracked here (not just inside DailyTidbitCard) so this
  // screen can hide them under the Current Affairs tab instead of always
  // showing regardless of which tab is selected.
  const [tidbitTab, setTidbitTab] = useState<'gk' | 'news'>('gk');

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="The World & You"
          subtitle="Learn something new every day"
          showBack={true}
          onMenuPress={() => navigation.openDrawer()}
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── Date pill ─────────────────────────────────────── */}
          <View style={styles.datePill}>
            <Feather name="calendar" size={13} color={TEAL} />
            <Text style={[styles.dateText, { color: TEAL }]}>
              {worldData?.date ?? new Date().toISOString().split('T')[0]}
            </Text>
            <View style={styles.gradePill}>
              <Text style={[styles.gradeText, { color: colors.textMuted }]}>{grade}</Text>
            </View>
          </View>

          {/* ── GK + Current Affairs card ─────────────────────── */}
          <DailyTidbitCard grade={grade} studentId={studentId || undefined} onTabChange={setTidbitTab} />

          {/* ── On This Day / Brain Teaser — GK-tab content only ─ */}
          {tidbitTab === 'gk' && (
            loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color={TEAL} />
                <Text style={[styles.hint, { color: colors.textMuted }]}>Loading history & challenge…</Text>
              </View>
            ) : error ? (
              <View style={styles.center}>
                <Feather name="wifi-off" size={26} color={colors.textDim} />
                <Text style={[styles.hint, { color: colors.textMuted }]}>{error}</Text>
              </View>
            ) : worldData ? (
              <>
                {worldData.onThisDay?.length > 0 && (
                  <OnThisDayCard items={worldData.onThisDay} styles={styles} colors={colors} />
                )}
                {worldData.funChallenge && (
                  <BrainTeaserCard
                    challenge={worldData.funChallenge}
                    showAnswer={showAnswer}
                    onReveal={() => setShowAnswer(true)}
                    styles={styles}
                    colors={colors}
                  />
                )}
              </>
            ) : null
          )}

        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

const makeStyles = (c: AppColors, isDark: boolean) => StyleSheet.create({
  screen:  { flex: 1, backgroundColor: c.bgDark },
  content: { padding: spacing.xl, paddingBottom: 56, gap: spacing.lg },
  center:  { alignItems: 'center', gap: 10, paddingVertical: 24 },
  hint:    { fontSize: 13, textAlign: 'center' },

  // Date row
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, fontWeight: '700' },
  gradePill: { marginLeft: 'auto' },
  gradeText: { fontSize: 12 },

  // Card
  card: {
    backgroundColor: c.cardDark,
    borderWidth: 1,
    borderColor: isDark ? c.borderColor : '#d0e0de',
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBadge: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardSub:   { fontSize: 11, marginTop: 1 },
  divider:   { height: 1, borderRadius: 1 },

  // On This Day
  factRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  yearBadge: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 7, borderWidth: 1, marginTop: 2,
  },
  yearText: { fontSize: 11, fontWeight: '800' },
  factText: { flex: 1, fontSize: 14, lineHeight: 21 },

  // Brain Teaser
  challengeQ: { fontSize: 15, fontWeight: '700', lineHeight: 24 },
  answerBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: radius.md, borderWidth: 1,
  },
  answerText: { flex: 1, fontSize: 14, fontWeight: '700' },
  revealBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 7, paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 10, borderWidth: 1,
  },
  revealBtnText: { fontSize: 13, fontWeight: '700' },
});
