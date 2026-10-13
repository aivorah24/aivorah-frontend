import React from 'react';
import { View, Text } from 'react-native';
import type { AppColors } from '../../../../theme';
import { attendanceTone } from '../../../../theme/attendanceColors';

const CARDS = [
  { key: 'present', label: 'Present' },
  { key: 'absent', label: 'Absent' },
  { key: 'late', label: 'Late' },
  { key: 'unmarked', label: 'Unmarked' },
] as const;

export default function StatsRow({ stats, styles, colors }: {
  stats: { present: number; absent: number; late: number; unmarked: number };
  styles: any;
  colors: AppColors;
}) {
  return (
    <View style={styles.statsContainer}>
      {CARDS.map((c) => {
        const t = attendanceTone(colors, c.key);
        return (
          <View key={c.key} testID={`attendance-stat-card-${c.key}`} style={[styles.statCard, { borderLeftColor: t.fg, backgroundColor: t.bg, borderColor: t.border }]}>
            <Text testID={`attendance-stat-${c.key}`} style={[styles.statValue, { color: t.fg }]}>{stats[c.key]}</Text>
            <Text style={[styles.statLabel, { color: t.fg }]}>{c.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
