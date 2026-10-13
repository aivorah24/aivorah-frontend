import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AppColors } from '../../../../theme';
import { BRAND } from '../constants';
import type { makeStyles } from '../DashboardScreen';

interface BarTopic {
  label: string;
  fullLabel: string;
  subject: string;
  pct: number;
  hasData: boolean;
  mastered: boolean;
  inProgress: boolean;
}

interface BestTopic {
  label: string;
  fullLabel: string;
  subject: string;
  pct: number;
}

interface PerformanceCardProps {
  styles: ReturnType<typeof makeStyles>;
  colors: AppColors;
  isDark: boolean;
  cardBg: string;
  cardBorder: string;
  avgScore: number;
  masteredTopics: number;
  topicsGoal: number;
  consistency: number;
  bestTopic: BestTopic | null;
  bestChapter: string | null;
  weeklyConsistency: number;
  barSubjects: string[];
  barSubjectFilter: string;
  setBarSubjectFilter: (subject: string) => void;
  barTopics: BarTopic[];
  perfInsight: string;
}

// Performance card — average/mastered/consistency pills, best-score +
// weekly-consistency pills, subject filter chips, and the scrollable bar
// chart across every unit for the selected subject.
export function PerformanceCard({
  styles,
  colors,
  isDark,
  cardBg,
  cardBorder,
  avgScore,
  masteredTopics,
  topicsGoal,
  consistency,
  bestTopic,
  bestChapter,
  weeklyConsistency,
  barSubjects,
  barSubjectFilter,
  setBarSubjectFilter,
  barTopics,
  perfInsight,
}: PerformanceCardProps) {
  return (
    <View style={[styles.perfCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <LinearGradient
        colors={isDark ? [BRAND.indigo + '40', BRAND.violet + '28'] : [BRAND.indigo + '14', BRAND.violet + '0a']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.perfHeaderGradient}
      >
        <View>
          <Text style={[styles.perfCardTitle, { color: colors.textMain }]}>Performance</Text>
          <Text style={[styles.perfCardSub, { color: colors.textMuted }]}>Unit scores at a glance</Text>
        </View>
      </LinearGradient>

      <View style={styles.perfInsightRow}>
        <View style={[styles.perfInsightPill, styles.perfInsightPillWide, { backgroundColor: isDark ? BRAND.indigo + '38' : BRAND.indigo + '18', borderColor: isDark ? BRAND.indigo + '70' : BRAND.indigo + '40' }]}>
          <Text style={[styles.perfInsightValue, { color: BRAND.indigo }]}>{avgScore}%</Text>
          <Text style={[styles.perfInsightLabel, { color: colors.textMuted }]}>Average score</Text>
        </View>
        <View style={[styles.perfInsightPill, { backgroundColor: isDark ? BRAND.green + '38' : BRAND.green + '18', borderColor: isDark ? BRAND.green + '70' : BRAND.green + '40' }]}>
          <Text style={[styles.perfInsightValue, { color: BRAND.green }]}>{masteredTopics}/{topicsGoal}</Text>
          <Text style={[styles.perfInsightLabel, { color: colors.textMuted }]}>Mastered</Text>
        </View>
        <View style={[styles.perfInsightPill, { backgroundColor: isDark ? BRAND.orange + '38' : BRAND.orange + '18', borderColor: isDark ? BRAND.orange + '70' : BRAND.orange + '40' }]}>
          <Text style={[styles.perfInsightValue, { color: BRAND.orange }]}>{consistency}%</Text>
          <Text style={[styles.perfInsightLabel, { color: colors.textMuted }]}>Consistency</Text>
        </View>
      </View>

      {/* Compact best-score pill — was a full-width row before; the real chapter
          name (via bestChapter) replaces the raw topic name, matching how the
          rest of the dashboard names units rather than individual topics. */}
      <View style={styles.bestScoreCompactRow}>
        <View style={[styles.bestScorePill, { backgroundColor: isDark ? BRAND.indigo + '20' : BRAND.indigo + '10', borderColor: isDark ? BRAND.indigo + '50' : BRAND.indigo + '30' }]}>
          <Feather name="award" size={12} color={BRAND.indigo} />
          <Text style={[styles.bestScoreCompactVal, { color: colors.textMain }]}>
            {bestTopic ? `${bestTopic.pct}%` : '—'}
          </Text>
          <Text style={[styles.bestScoreCompactTopic, { color: colors.textMuted }]} numberOfLines={1}>
            {bestTopic ? (bestChapter ?? bestTopic.fullLabel ?? bestTopic.label) : 'No quizzes yet'}
          </Text>
        </View>
        <View style={[styles.bestScorePill, { backgroundColor: isDark ? BRAND.teal + '20' : BRAND.teal + '10', borderColor: isDark ? BRAND.teal + '50' : BRAND.teal + '30' }]}>
          <Feather name="calendar" size={12} color={BRAND.teal} />
          <Text style={[styles.bestScoreCompactVal, { color: colors.textMain }]}>{weeklyConsistency}%</Text>
          <Text style={[styles.bestScoreCompactTopic, { color: colors.textMuted }]}>this week</Text>
        </View>
      </View>

      {/* Subject filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        {barSubjects.map(subj => {
          const active = barSubjectFilter === subj;
          return (
            <TouchableOpacity
              key={subj}
              onPress={() => setBarSubjectFilter(subj)}
              style={[styles.barChip, { backgroundColor: active ? BRAND.indigo : (isDark ? BRAND.indigo + '20' : BRAND.indigo + '12'), borderColor: active ? BRAND.indigo : (isDark ? BRAND.indigo + '50' : BRAND.indigo + '30') }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.barChipTxt, { color: active ? '#fff' : BRAND.indigo }]}>{subj}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bar chart — all topics, scrollable */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.barScroll} contentContainerStyle={{ gap: 16, paddingVertical: 4, paddingRight: 6 }}>
        {barTopics.map((t, i) => {
          const barColors = [
            ['#BAA467', '#C5BD96'],
            ['#BAA467', '#C5BD96'],
            ['#BAA467', '#C5BD96'],
            ['#BAA467', '#C5BD96'],
            ['#BAA467', '#C5BD96'],
            ['#BAA467', '#C5BD96'],
          ];
          const [c1, c2] = barColors[i % barColors.length];
          // In-progress (started via Learn/Listen, no score/mastery yet) gets
          // a distinct dashed teal outline — reuses the app's existing
          // "study time" teal (BRAND.teal) rather than inventing a new color
          // — plus a small "In Progress" caption instead of "0%", so a
          // student who's opened a chapter but not yet quizzed it can tell
          // it apart from one they've never touched.
          const showInProgress = t.inProgress && !t.hasData;
          return (
            <View key={`${t.fullLabel}-${i}`} style={styles.barCol}>
              <Text style={[styles.barPct, { color: t.hasData ? c1 : showInProgress ? BRAND.teal : colors.textDim }]}>
                {t.hasData ? `${t.pct}%` : showInProgress ? 'Started' : `${t.pct}%`}
              </Text>
              <View style={[styles.barTrack, { borderColor: showInProgress ? BRAND.teal + '60' : c1 + '40' }]}>
                <LinearGradient
                  colors={t.hasData ? [c1, c2] : showInProgress ? [BRAND.teal + '60', BRAND.teal + '30'] : [colors.borderColor, colors.borderColor]}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                  style={[styles.barFill, { height: `${Math.max(t.pct, showInProgress ? 10 : 4)}%` as any }]}
                />
              </View>
              <Text style={[styles.barLabel, { color: colors.textDim }]} numberOfLines={2}>{t.label}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Dynamic insight based on real performance */}
      <View style={[styles.perfInsightText, { backgroundColor: isDark ? BRAND.indigo + '18' : BRAND.indigo + '0C', borderColor: isDark ? BRAND.indigo + '40' : BRAND.indigo + '25' }]}>
        <Feather name="zap" size={12} color={BRAND.indigo} />
        <Text style={[styles.perfInsightMsg, { color: colors.textMuted }]}>{perfInsight}</Text>
      </View>
    </View>
  );
}
