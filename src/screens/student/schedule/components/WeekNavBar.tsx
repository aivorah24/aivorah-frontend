import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

interface Props {
  week: { iso: string; day: string; date: number }[];
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  styles: any;
  colors: AppColors;
}

export default function WeekNavBar({ week, onPrevWeek, onNextWeek, onToday, styles, colors }: Props) {
  return (
    <View style={styles.weekNavBar}>
      <TouchableOpacity
        style={styles.navArrow}
        onPress={onPrevWeek}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Previous week"
        testID="schedule-prev-week"
      >
        <Feather name="chevron-left" size={18} color={colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.todayBtn}
        onPress={onToday}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Today"
        testID="schedule-today-button"
      >
        <Text style={styles.todayBtnText}>Today</Text>
      </TouchableOpacity>
      <Text style={styles.weekLabel} testID="schedule-week-label">
        {week[0].day} {week[0].date} — {week[6].day} {week[6].date}
      </Text>
      <TouchableOpacity
        style={styles.navArrow}
        onPress={onNextWeek}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Next week"
        testID="schedule-next-week"
      >
        <Feather name="chevron-right" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}
