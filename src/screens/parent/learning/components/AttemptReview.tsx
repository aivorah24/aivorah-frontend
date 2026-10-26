import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { TopicAttempt } from '../types';
import { formatDuration, scoreColor, TONE } from '../utils/topicAttempts';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

// One topic's practice history: pick an attempt, see its score and each question.
export default function AttemptReview({ attempts, colors, accent }: {
  attempts: TopicAttempt[]; // newest first
  colors: AppColors;
  accent: string;
}) {
  const [selectedId, setSelectedId] = useState(attempts[0]?.id);
  const attempt = attempts.find(a => a.id === selectedId) ?? attempts[0];
  const mistakes = attempt?.questions.filter(q => !q.isCorrect) ?? [];
  const [mistakesOnly, setMistakesOnly] = useState(true);

  if (!attempt) return null;
  const shown = mistakesOnly && mistakes.length > 0 ? mistakes : attempt.questions;
  const n = attempts.length;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bgDark, borderColor: colors.borderColor }]} testID="attempt-review">
      {n > 1 && (
        <View style={styles.tabs}>
          {attempts.map((a, i) => {
            const active = a.id === attempt.id;
            const tone = scoreColor(a.score, colors.accentYellow);
            return (
              <TouchableOpacity
                key={a.id}
                testID={`attempt-tab-${n - i}`}
                onPress={() => setSelectedId(a.id)}
                style={[styles.tab, { borderColor: active ? accent : colors.borderColor, backgroundColor: active ? accent + '18' : 'transparent' }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, { color: active ? accent : colors.textMuted }]}>Try {n - i}</Text>
                <Text style={[styles.tabScore, { color: tone }]}>{a.score}%</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.summary}>
        <Text style={[styles.summaryMain, { color: colors.textMain }]}>
          {attempt.correctAnswers}/{attempt.totalQuestions || attempt.questions.length} correct
        </Text>
        <Text style={[styles.summaryMeta, { color: colors.textMuted }]}>
          {formatDuration(attempt.timeSpentSeconds)} · {fmtDate(attempt.createdAt)}
        </Text>
        {mistakes.length > 0 && (
          <TouchableOpacity
            testID="mistakes-only-toggle"
            onPress={() => setMistakesOnly(v => !v)}
            style={[styles.toggle, { borderColor: colors.borderColor }]}
            activeOpacity={0.8}
          >
            <Feather name={mistakesOnly ? 'check-square' : 'square'} size={12} color={accent} />
            <Text style={[styles.toggleText, { color: colors.textMuted }]}>Mistakes only ({mistakes.length})</Text>
          </TouchableOpacity>
        )}
      </View>

      {attempt.questions.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>Question details weren&apos;t saved for this try.</Text>
      ) : (
        shown.map((q, i) => (
          <View key={i} style={[styles.q, { borderTopColor: colors.borderColor }]} testID="attempt-question">
            <Feather name={q.isCorrect ? 'check-circle' : 'x-circle'} size={14} color={q.isCorrect ? TONE.good : TONE.low} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.qText, { color: colors.textMain }]}>{q.question}</Text>
              <Text style={[styles.answer, { color: q.isCorrect ? TONE.good : TONE.low }]}>
                Answered: {q.studentAnswer || 'No answer'}
              </Text>
              {!q.isCorrect && (
                <Text style={[styles.answer, { color: TONE.good }]}>Correct: {q.correctAnswer}</Text>
              )}
            </View>
            {q.timeSeconds != null && (
              <Text style={[styles.qTime, { color: colors.textDim }]}>{formatDuration(q.timeSeconds)}</Text>
            )}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:        { marginTop: 10, borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  tabs:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tab:         { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tabText:     { fontFamily: fonts.serif, fontSize: 11, fontWeight: '700' },
  tabScore:    { fontFamily: fonts.serif, fontSize: 11, fontWeight: '800' },
  summary:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  summaryMain: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '800' },
  summaryMeta: { fontFamily: fonts.serif, fontSize: 11, fontWeight: '600', flex: 1 },
  toggle:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  toggleText:  { fontFamily: fonts.serif, fontSize: 11, fontWeight: '600' },
  empty:       { fontFamily: fonts.serif, fontSize: 12 },
  q:           { flexDirection: 'row', gap: 10, borderTopWidth: 1, paddingTop: 10 },
  qText:       { fontFamily: fonts.serif, fontSize: 13, fontWeight: '600' },
  answer:      { fontFamily: fonts.serif, fontSize: 12, fontWeight: '600' },
  qTime:       { fontFamily: fonts.serif, fontSize: 10, fontWeight: '600' },
});
