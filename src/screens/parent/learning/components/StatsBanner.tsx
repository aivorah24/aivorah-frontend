import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { formatStudyTime } from '../constants';
import type { ChildReport } from '../types';

export default function StatsBanner({ report, colors, isDark }: { report: ChildReport | null; colors: AppColors; isDark: boolean }) {
  const bg = isDark ? colors.cardDark : '#FFFFFF';
  const items = [
    { icon: 'clock', label: 'Study Time', value: report ? formatStudyTime(report.totalMinutes) : '–' },
    { icon: 'message-circle', label: 'AI Chats', value: report ? String(report.totalAIChats) : '–' },
    { icon: 'star', label: 'Avg Score', value: report?.avgScore != null ? `${report.avgScore}%` : '–' },
    { icon: 'book', label: 'Topics Active', value: report ? String(report.topicCount) : '–' },
  ];
  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: colors.borderColor }]}>
      {items.map((item, i) => (
        <View key={item.label} style={[styles.item, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.borderColor }]}>
          <View style={[styles.iconBox, { backgroundColor: colors.accentYellow + '18' }]}>
            <Feather name={item.icon as any} size={14} color={colors.accentYellow} />
          </View>
          <Text style={[styles.value, { color: colors.textMain }]}>{item.value}</Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.xl, overflow: 'hidden' },
  item:    { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  iconBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  value:   { fontFamily: fonts.serif, fontSize: 15, fontWeight: '800' },
  label:   { fontFamily: fonts.serif, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
});
