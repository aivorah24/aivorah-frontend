import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing } from '../../../../theme';
import { formatStudyTime } from '../../../../context/StudentDataContext';
import type { DayActivity } from '../types';

export function WeeklyActivityCard({
  styles, colors, periodTab, setPeriodTab, weeklyDays, maxMinutes,
}: {
  styles: any;
  colors: any;
  periodTab: 'Week' | 'Month';
  setPeriodTab: (p: 'Week' | 'Month') => void;
  weeklyDays: DayActivity[];
  maxMinutes: number;
}) {
  return (
    <View style={[styles.glassCard, { marginBottom: spacing.xxl }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{periodTab === 'Month' ? 'Monthly Activity' : 'Weekly Activity'}</Text>
        <View style={styles.periodTabs}>
          {(['Week', 'Month'] as const).map((p) => (
            <TouchableOpacity key={p} style={[styles.periodTab, periodTab === p && styles.periodTabActive]} onPress={() => setPeriodTab(p)} activeOpacity={0.7}>
              <Text style={[styles.periodTabText, periodTab === p && styles.periodTabTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {weeklyDays.every(d => d.studyMinutes === 0 && d.xp === 0) ? (
        <View style={styles.emptyBar}>
          <Feather name="bar-chart-2" size={28} color={colors.textDim} />
          <Text style={styles.emptyText}>No activity yet this {periodTab === 'Month' ? 'month' : 'week'}.{'\n'}Complete lessons to see your chart!</Text>
        </View>
      ) : (
        <View style={styles.barChart}>
          {weeklyDays.map((d) => {
            const heightPct = maxMinutes > 0 ? (d.studyMinutes / maxMinutes) * 100 : 0;
            const isToday = d.date === new Date().toISOString().split('T')[0];
            return (
              <View key={d.date} style={styles.barItem}>
                <Text style={[styles.barMinute, isToday && { color: colors.accentGreen }]}>
                  {d.studyMinutes > 0 ? `${d.studyMinutes}m` : ''}
                </Text>
                <View style={styles.barWrapper}>
                  <View style={[
                    styles.bar,
                    { height: `${Math.max(heightPct, 6)}%` as any, backgroundColor: isToday ? '#9FB2A4' : colors.borderColor },
                    isToday && styles.barActive,
                  ]} />
                </View>
                <Text style={[styles.barLabel, isToday && { color: colors.accentGreen, fontWeight: '700' }]}>{d.day}</Text>
              </View>
            );
          })}
        </View>
      )}
      {/* Weekly totals */}
      <View style={styles.weekTotals}>
        {[
          { label: 'Total Study', val: formatStudyTime(weeklyDays.reduce((s, d) => s + d.studyMinutes, 0)), color: '#BAA467' },
          { label: 'XP Earned',   val: `+${weeklyDays.reduce((s, d) => s + d.xp, 0)}`,                      color: '#8A8358' },
          { label: 'Topics',       val: String(weeklyDays.reduce((s, d) => s + d.topicsCompleted, 0)),       color: '#7E9A86' },
        ].map(s => (
          <View key={s.label} style={styles.weekTotal}>
            <Text style={[styles.weekTotalVal, { color: s.color }]}>{s.val}</Text>
            <Text style={styles.weekTotalLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
