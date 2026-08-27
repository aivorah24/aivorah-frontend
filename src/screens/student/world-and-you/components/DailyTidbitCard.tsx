/**
 * DailyTidbitCard.tsx
 * Dashboard widget — shows today's GK Fact + Current Affairs.
 * Content is grade-specific and rotates daily via the server cache.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { spacing, radius } from '../../../../theme';
import { useDailyTidbit } from '../hooks/useDailyTidbit';
import { useTidbitQuiz } from '../hooks/useTidbitQuiz';
import { categoryIcon } from '../utils/quizHelpers';
import QuizSection from './QuizSection';

interface Props {
  grade: string;
  studentId?: string;
  onTabChange?: (tab: 'gk' | 'news') => void;
}

export default function DailyTidbitCard({ grade, studentId, onTabChange }: Props) {
  const { colors, isDark } = useTheme();
  const { resetQuiz, ...quiz } = useTidbitQuiz({ grade, studentId });
  const { tab, setTab, data, loading, error, loadTidbit } = useDailyTidbit(grade, resetQuiz, onTabChange);

  // ── Theme tokens ─────────────────────────────────────────────────
  const teal        = '#BAA467';
  const rose        = '#BAA467';
  const cardBg      = isDark ? colors.cardDark  : '#F0F7F6';
  const borderCol   = isDark ? colors.borderColor : teal + '25';
  const activeTab   = tab === 'gk' ? teal : rose;
  const titleColor  = isDark ? colors.textMain : '#1C2A28';
  const mutedColor  = colors.textMuted;

  return (
    <View style={[s.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
      {/* Header */}
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <View style={[s.iconCircle, { backgroundColor: activeTab + '20' }]}>
            <Feather name={tab === 'gk' ? 'star' : 'radio'} size={14} color={activeTab} />
          </View>
          <View>
            <Text style={[s.cardTitle, { color: titleColor }]}>
              {tab === 'gk' ? 'Did You Know?' : 'Today in the World'}
            </Text>
            <Text style={[s.cardSub, { color: mutedColor }]}>
              {tab === 'gk' ? 'Daily Knowledge' : 'Current Affairs'} · {grade}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={loadTidbit} style={s.refreshBtn} disabled={loading}>
          <Feather name="refresh-cw" size={14} color={mutedColor} />
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      <View style={[s.tabs, { backgroundColor: isDark ? colors.bgDark : teal + '10', borderColor: borderCol }]}>
        <TouchableOpacity
          style={[s.tab, tab === 'gk' && { backgroundColor: teal, borderRadius: radius.sm - 2 }]}
          onPress={() => setTab('gk')}
          activeOpacity={0.8}
        >
          <Feather name="star" size={12} color={tab === 'gk' ? '#fff' : mutedColor} />
          <Text style={[s.tabText, { color: tab === 'gk' ? '#fff' : mutedColor }]}>GK Fact</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'news' && { backgroundColor: rose, borderRadius: radius.sm - 2 }]}
          onPress={() => setTab('news')}
          activeOpacity={0.8}
        >
          <Feather name="radio" size={12} color={tab === 'news' ? '#fff' : mutedColor} />
          <Text style={[s.tabText, { color: tab === 'news' ? '#fff' : mutedColor }]}>Current Affairs</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="small" color={activeTab} />
          <Text style={[s.loadingText, { color: mutedColor }]}>Fetching today&apos;s tidbit...</Text>
        </View>
      ) : error ? (
        <View style={s.loadingBox}>
          <Feather name="wifi-off" size={20} color={mutedColor} />
          <Text style={[s.loadingText, { color: mutedColor }]}>Couldn&apos;t load. Tap refresh to try again.</Text>
        </View>
      ) : data ? (
        tab === 'gk' ? (
          <View style={s.content}>
            <View style={[s.categoryBadge, { backgroundColor: teal + '18', borderColor: teal + '40' }]}>
              <Feather name={categoryIcon(data.gk.category) as any} size={11} color={teal} />
              <Text style={[s.categoryText, { color: teal }]}>{data.gk.category}</Text>
            </View>
            <Text style={[s.factText, { color: titleColor }]}>
              {(() => {
                const f = data.gk.fact;
                if (typeof f === 'string' && f.trim().startsWith('{')) {
                  try { return JSON.parse(f).fact || f; } catch { return f; }
                }
                return f;
              })()}
            </Text>
          </View>
        ) : (
          <View style={s.content}>
            <View style={[s.categoryBadge, { backgroundColor: rose + '18', borderColor: rose + '40' }]}>
              <Feather name="radio" size={11} color={rose} />
              <Text style={[s.categoryText, { color: rose }]}>Current Affairs</Text>
            </View>
            <Text style={[s.headlineText, { color: titleColor }]}>{data.currentAffairs.headline}</Text>
            <Text style={[s.summaryText, { color: mutedColor }]}>{data.currentAffairs.summary}</Text>

            {/* ── Comprehension Quiz ───────────────────────────── */}
            <QuizSection
              {...quiz}
              isDark={isDark}
              colors={colors}
              styles={s}
              onStart={() => quiz.startQuiz(data.currentAffairs)}
              onAnswer={(idx) => quiz.handleAnswer(idx, data.currentAffairs)}
            />
          </View>
        )
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle:  { fontSize: 14, fontWeight: '700' },
  cardSub:    { fontSize: 11, marginTop: 1 },
  refreshBtn: { padding: 6 },

  tabs: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
  },
  tabText: { fontSize: 12, fontWeight: '600' },

  loadingBox: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingText: { fontSize: 12, textAlign: 'center' },

  content:      { gap: spacing.sm },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: { fontSize: 11, fontWeight: '700' },
  factText:     { fontSize: 14, fontWeight: '500', lineHeight: 22 },
  headlineText: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  summaryText:  { fontSize: 13, lineHeight: 20 },

  // Quiz
  quizBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, marginTop: 4,
  },
  quizBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  quizLoadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  quizLoadText: { fontSize: 12 },
  quizDoneBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 4,
  },
  quizDoneIcon: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  quizDoneText:  { fontSize: 13, fontWeight: '600', flex: 1 },
  quizDoneTitle: { fontSize: 14, fontWeight: '800' },
  quizXpText:    { fontSize: 12, marginTop: 2 },
  quizBox: {
    borderWidth: 1, borderRadius: 12, padding: 12, gap: 10, marginTop: 4,
  },
  quizCounter:  { fontSize: 11, fontWeight: '600' },
  quizQuestion: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  optionsCol:   { gap: 6 },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 8, borderWidth: 1,
  },
  optionIdx: {
    width: 22, height: 22, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  optionIdxText: { fontSize: 11, fontWeight: '800' },
  optionText:    { flex: 1, fontSize: 13, fontWeight: '500' },
});
