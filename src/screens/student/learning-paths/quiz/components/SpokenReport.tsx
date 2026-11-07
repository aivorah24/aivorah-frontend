/**
 * SpokenReport - the practice report's card for the spoken question: what the
 * student said, the score out of 10, which key ideas they explained, what to
 * add next time, anything they got wrong, and Aivorah's feedback.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import type { SpokenEvaluation } from '../types';

const VERDICT: Record<SpokenEvaluation['verdict'], string> = {
  excellent: 'Excellent explanation',
  good: 'Good explanation',
  partial: 'Partly explained',
  needs_work: 'Needs more work',
};

function ReportList({ title, items, icon, color, textColor }: {
  title: string; items?: string[]; icon: any; color: string; textColor: string;
}) {
  if (!items || !items.length) return null;
  return (
    <View style={s.listBlock}>
      <Text style={[s.listTitle, { color }]}>{title}</Text>
      {items.map((t, i) => (
        <View key={i} style={s.listRow}>
          <Feather name={icon} size={13} color={color} style={{ marginTop: 3 }} />
          <Text style={[s.listText, { color: textColor }]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

export default function SpokenReport({ question, said, evaluation, colors }: {
  question: string;
  said: string;
  evaluation?: Partial<SpokenEvaluation> | null;
  colors: AppColors;
}) {
  const accent = colors.accentYellow;
  const good = '#9FB2A4';
  const warn = '#C98A8A';
  const ev = evaluation || {};
  const score = typeof ev.score === 'number' ? ev.score : null;
  const passed = !!ev.passed;
  const tone = passed ? good : warn;

  return (
    <View testID="spoken-report" style={[s.card, { backgroundColor: colors.cardDark, borderColor: tone + '40', borderLeftColor: tone }]}>
      <View style={s.head}>
        <View style={[s.icon, { backgroundColor: accent + '20' }]}>
          <Feather name="mic" size={15} color={accent} />
        </View>
        <Text style={[s.question, { color: colors.textMain }]}>{question}</Text>
        {score !== null && (
          <View style={[s.scoreChip, { backgroundColor: tone + '1F', borderColor: tone + '60' }]}>
            <Text style={[s.scoreText, { color: tone }]}>{score}/{ev.outOf || 10}</Text>
          </View>
        )}
      </View>
      {!!ev.verdict && <Text style={[s.verdict, { color: tone }]}>{VERDICT[ev.verdict as SpokenEvaluation['verdict']] || ''}</Text>}

      <Text style={[s.label, { color: colors.textMuted }]}>What you said</Text>
      <View style={[s.said, { backgroundColor: colors.bgDark }]}>
        <Text style={[s.saidText, { color: colors.textMain }]} selectable>“{said}”</Text>
      </View>

      <ReportList title="You explained well" items={ev.covered} icon="check" color={good} textColor={colors.textMain} />
      <ReportList title="Add next time" items={ev.missing} icon="plus-circle" color={accent} textColor={colors.textMain} />
      <ReportList title="Check this" items={ev.mistakes} icon="alert-circle" color={warn} textColor={colors.textMain} />

      {!!ev.feedback && (
        <View style={[s.feedback, { backgroundColor: accent + '10', borderColor: accent + '30' }]}>
          <Feather name="book-open" size={13} color={accent} style={{ marginTop: 2 }} />
          <Text style={[s.feedbackText, { color: colors.textMain }]}>
            <Text style={{ fontWeight: '800', color: accent }}>Aivorah: </Text>{ev.feedback}
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderLeftWidth: 4, borderRadius: 14, padding: 16, gap: 8, width: '100%' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  icon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  question: { flex: 1, fontSize: 14.5, fontWeight: '700', lineHeight: 22 },
  scoreChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  scoreText: { fontSize: 13, fontWeight: '800' },
  verdict: { fontSize: 12.5, fontWeight: '800', marginLeft: 38 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 4 },
  said: { borderRadius: 8, padding: 12 },
  saidText: { fontSize: 14, lineHeight: 21, fontStyle: 'italic' },
  listBlock: { gap: 4, marginTop: 2 },
  listTitle: { fontSize: 12, fontWeight: '800' },
  listRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  listText: { flex: 1, fontSize: 13.5, lineHeight: 20 },
  feedback: { flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 4 },
  feedbackText: { flex: 1, fontSize: 13, lineHeight: 20 },
});
