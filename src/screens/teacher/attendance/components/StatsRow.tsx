import React from 'react';
import { View, Text } from 'react-native';

const CARDS = [
  { key: 'present', label: 'Present', color: '#0ca678', bg: '#e6fcf5', border: '#c3fae8' },
  { key: 'absent', label: 'Absent', color: '#f03e3e', bg: '#fff5f5', border: '#ffe3e3' },
  { key: 'late', label: 'Late', color: '#ba905a', bg: '#ba905a12', border: '#ba905a25' },
  { key: 'unmarked', label: 'Unmarked', color: '#495057', bg: '#f8f9fa', border: '#e9ecef' },
] as const;

export default function StatsRow({ stats, styles }: {
  stats: { present: number; absent: number; late: number; unmarked: number };
  styles: any;
}) {
  return (
    <View style={styles.statsContainer}>
      {CARDS.map((c) => (
        <View key={c.key} style={[styles.statCard, { borderLeftColor: c.color, backgroundColor: c.bg, borderColor: c.border }]}>
          <Text testID={`attendance-stat-${c.key}`} style={[styles.statValue, { color: c.color }]}>{stats[c.key]}</Text>
          <Text style={[styles.statLabel, { color: c.color }]}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}
