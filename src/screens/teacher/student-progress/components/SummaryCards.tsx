import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import type { AppColors } from '../../../../theme';
import type { SubjectSummaryRow } from '../types';
import { secondsLabel } from '../utils/formatters';

interface Props {
  colors: AppColors;
  gold: string;
  subjects: SubjectSummaryRow[];
  combined: Omit<SubjectSummaryRow, 'subject'> | null;
  loading: boolean;
}

function Card({ colors, gold, title, pct, attemptSeconds, attemptCount, testID }: {
  colors: AppColors; gold: string; title: string; pct: number | null; attemptSeconds: number | null; attemptCount: number; testID: string;
}) {
  return (
    <View testID={testID} style={{ minWidth: 150, flex: 1, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, padding: 12, backgroundColor: colors.bgDark }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMain, marginBottom: 8 }} numberOfLines={1}>{title}</Text>
      {pct == null ? (
        <Text style={{ fontSize: 12, color: colors.textDim }}>No attempts yet</Text>
      ) : (
        <>
          <Text style={{ fontSize: 24, fontWeight: '800', color: gold, marginBottom: 4 }}>{pct}%</Text>
          <View style={{ height: 6, backgroundColor: colors.borderColor, borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
            <View style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: gold, borderRadius: 3 }} />
          </View>
          <Text style={{ fontSize: 10, color: colors.textDim }}>Avg attempt: {secondsLabel(attemptSeconds)} · {attemptCount} attempt{attemptCount === 1 ? '' : 's'}</Text>
        </>
      )}
    </View>
  );
}

export default function SummaryCards({ colors, gold, subjects, combined, loading }: Props) {
  if (loading) return null;
  if (subjects.length === 0) return null;

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMain, marginBottom: 8 }}>Where the class stands, by subject</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {subjects.map((s) => (
            <Card key={s.subject} colors={colors} gold={gold} title={s.subject} pct={s.avgScorePct} attemptSeconds={s.avgAttemptSeconds} attemptCount={s.attemptCount} testID={`subject-card-${s.subject}`} />
          ))}
          {combined && (
            <Card colors={colors} gold={gold} title="All subjects combined" pct={combined.avgScorePct} attemptSeconds={combined.avgAttemptSeconds} attemptCount={combined.attemptCount} testID="subject-card-combined" />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
