import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

interface Props {
  stats: { xpPoints: number; challengesCompleted: number; currentStreak: number };
  styles: any;
  colors: AppColors;
}

export default function StatsRow({ stats, styles, colors }: Props) {
  const items = [
    { label: 'Total XP',    value: stats.xpPoints.toLocaleString(),  icon: 'star' as const,  color: colors.accentYellow },
    { label: 'Challenges',  value: String(stats.challengesCompleted), icon: 'award' as const, color: colors.accentGreen },
    { label: 'Streak',      value: `${stats.currentStreak}d`,        icon: 'zap' as const,   color: colors.accentRed },
  ];
  return (
    <View style={styles.statsRow}>
      {items.map(s => (
        <View key={s.label} style={styles.statCard}>
          <Feather name={s.icon} size={14} color={s.color} />
          <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
          <Text style={styles.statLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}
