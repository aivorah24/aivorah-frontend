import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import type { AppColors } from '../../../../theme';
import type { SubjectProgressCard } from '../utils/subjectSummary';

interface Props {
  colors: AppColors;
  gold: string;
  subjects: SubjectProgressCard[];
  loading: boolean;
}

function Card({ colors, gold, title, pct, studentCount, testID }: {
  colors: AppColors; gold: string; title: string; pct: number | null; studentCount: number; testID: string;
}) {
  return (
    <View testID={testID} style={{ minWidth: 160, flex: 1, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, padding: 12, backgroundColor: colors.bgDark }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMain, marginBottom: 8 }} numberOfLines={1}>{title}</Text>
      {pct == null ? (
        <Text style={{ fontSize: 12, color: colors.textDim }}>No syllabus data yet</Text>
      ) : (
        <>
          <Text style={{ fontSize: 24, fontWeight: '800', color: gold, marginBottom: 4 }}>{pct}%</Text>
          <View style={{ height: 6, backgroundColor: colors.borderColor, borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
            <View style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: gold, borderRadius: 3 }} />
          </View>
          {/* "of syllabus mastered" rather than "class average mastery" — the
              denominator is now the real curriculum topic count (from
              Qdrant), not just what's been attempted, so the label must say
              what's actually being measured. */}
          <Text style={{ fontSize: 10, color: colors.textDim }}>of syllabus mastered · {studentCount} student{studentCount === 1 ? '' : 's'}</Text>
        </>
      )}
    </View>
  );
}

export default function SummaryCards({ colors, gold, subjects, loading }: Props) {
  if (loading) return null;
  if (subjects.length === 0) return null;

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMain, marginBottom: 8 }}>Subject Progress</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {subjects.map((s) => (
            <Card key={s.subject} colors={colors} gold={gold} title={s.subject} pct={s.avgMasteryPct} studentCount={s.studentCount} testID={`subject-card-${s.subject}`} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
