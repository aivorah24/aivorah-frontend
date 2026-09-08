import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { TopicAnalytics } from '../types';

export default function TopicRow({
  topic, analytics, isDone, accent, colors, isLast,
}: {
  topic: any;
  analytics: TopicAnalytics | undefined;
  isDone: boolean;
  accent: string;
  colors: AppColors;
  isLast: boolean;
}) {
  const score = analytics?.avgScore;
  const chats = analytics?.aiChats ?? 0;
  const mins  = analytics?.minutesSpent ?? 0;

  const statusColor = isDone ? '#4A9E70' : analytics?.hasActivity ? '#C87848' : colors.textDim;
  const statusIcon  = isDone ? 'check-circle' : analytics?.hasActivity ? 'clock' : 'circle';
  const statusLabel = isDone ? 'Done' : analytics?.hasActivity ? 'In Progress' : 'Not started';

  return (
    <View style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: accent + '30' }]}>
      <Feather name={statusIcon as any} size={14} color={statusColor} style={{ marginTop: 1 }} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textMain }]} numberOfLines={2}>
          {topic.topic || topic}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
          {chats > 0 && (
            <View style={styles.chip}>
              <Feather name="message-circle" size={10} color={accent} />
              <Text style={[styles.chipText, { color: accent }]}>{chats} chats</Text>
            </View>
          )}
          {mins > 0 && (
            <View style={styles.chip}>
              <Feather name="clock" size={10} color={accent} />
              <Text style={[styles.chipText, { color: accent }]}>{mins}m</Text>
            </View>
          )}
        </View>
      </View>
      {score != null && (
        <View style={[styles.scoreBadge, { backgroundColor: score >= 70 ? '#4A9E7022' : '#C8487022', borderColor: score >= 70 ? '#4A9E7066' : '#C8487066' }]}>
          <Text style={[styles.scoreText, { color: score >= 70 ? '#4A9E70' : '#C84870' }]}>{score}%</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  info:      { flex: 1, gap: 4 },
  name:      { fontFamily: fonts.serif, fontSize: 13, fontWeight: '600' },
  metaRow:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  status:    { fontFamily: fonts.serif, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  chip:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
  chipText:  { fontFamily: fonts.serif, fontSize: 10, fontWeight: '600' },
  scoreBadge:{ borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  scoreText: { fontFamily: fonts.serif, fontSize: 11, fontWeight: '800' },
});
