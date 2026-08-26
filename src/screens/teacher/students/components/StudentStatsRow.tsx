import React from 'react';
import { View, Text } from 'react-native';
import type { AppColors } from '../../../../theme';
import type { StudentStats } from '../types';

interface Props {
  stats: StudentStats;
  colors: AppColors;
  gold: string;
  styles: any;
}

export default function StudentStatsRow({ stats, colors, gold, styles }: Props) {
  return (
    <View style={styles.statsRow}>
      {[
        { label: 'Total', value: stats.total, color: gold },
        { label: 'On Track', value: stats.onTrack, color: colors.accentGreen },
        { label: 'Need Attention', value: stats.attention, color: colors.accentRed },
        { label: 'Avg Progress', value: `${stats.avgProgress}%`, color: colors.accentCyan },
      ].map((s) => (
        <View key={s.label} testID={`teacher-students-stat-${s.label.toLowerCase().replace(/\s+/g, '-')}`} style={styles.statCard}>
          <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
          <Text style={styles.statLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}
