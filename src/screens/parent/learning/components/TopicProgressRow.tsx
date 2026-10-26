import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { TopicSummary } from '../utils/topicAttempts';
import { formatDuration, scoreColor, TONE } from '../utils/topicAttempts';
import AttemptReview from './AttemptReview';

export default function TopicProgressRow({
  name, summary, isDone, expanded, onToggle, accent, colors, first,
}: {
  name: string;
  summary: TopicSummary;
  isDone: boolean;
  expanded: boolean;
  onToggle: () => void;
  accent: string;
  colors: AppColors;
  first?: boolean;
}) {
  const tries = summary.attempts.length;
  const practiced = tries > 0;
  const statusColor = isDone ? TONE.good : practiced ? colors.accentYellow : colors.textDim;
  const statusIcon  = isDone ? 'check-circle' : practiced ? 'clock' : 'circle';
  const statusLabel = isDone ? 'Done' : practiced ? 'Practising' : 'Not started';
  const best = summary.bestScore;
  const bestColor = best != null ? scoreColor(best, colors.accentYellow) : accent;

  return (
    <View style={[styles.row, { borderTopColor: colors.borderColor }, first && { borderTopWidth: 0 }]}>
      <TouchableOpacity
        style={styles.head}
        onPress={practiced ? onToggle : undefined}
        disabled={!practiced}
        activeOpacity={0.75}
        testID={`topic-row-${name}`}
        accessibilityRole={practiced ? 'button' : undefined}
        accessibilityLabel={practiced ? `${name}, ${tries} practice tries, best ${best}%` : `${name}, ${statusLabel}`}
      >
        <Feather name={statusIcon as any} size={15} color={statusColor} style={{ marginTop: 2 }} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.name, { color: colors.textMain }]} numberOfLines={2}>{name}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
            {practiced && (
              <>
                <Text style={[styles.meta, { color: colors.textMuted }]}>· {tries} {tries === 1 ? 'try' : 'tries'}</Text>
                {summary.totalSeconds > 0 && (
                  <Text style={[styles.meta, { color: colors.textMuted }]}>· {formatDuration(summary.totalSeconds)}</Text>
                )}
              </>
            )}
          </View>
        </View>
        {best != null && (
          <View style={[styles.score, { backgroundColor: bestColor + '18', borderColor: bestColor + '66' }]}>
            <Text style={[styles.scoreText, { color: bestColor }]}>{best}%</Text>
            <Text style={[styles.scoreLabel, { color: bestColor }]}>best</Text>
          </View>
        )}
        {practiced && (
          <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={accent} style={{ marginTop: 2 }} />
        )}
      </TouchableOpacity>
      {expanded && practiced && <AttemptReview attempts={summary.attempts} colors={colors} accent={accent} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row:        { borderTopWidth: 1, paddingVertical: 10, paddingHorizontal: 12 },
  head:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name:       { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700' },
  metaRow:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  status:     { fontFamily: fonts.serif, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  meta:       { fontFamily: fonts.serif, fontSize: 11, fontWeight: '600' },
  score:      { alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, minWidth: 52 },
  scoreText:  { fontFamily: fonts.serif, fontSize: 13, fontWeight: '800' },
  scoreLabel: { fontFamily: fonts.serif, fontSize: 8.5, fontWeight: '700', textTransform: 'uppercase' },
});
