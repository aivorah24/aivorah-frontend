import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { WeekDay } from '../types';

interface Props {
  colors: AppColors;
  styles: any;
  week: WeekDay[];
  weekBase: Date;
  setWeekBase: (d: Date) => void;
  goToday: () => void;
}

export default function WeekNavBar({ colors, styles, week, weekBase, setWeekBase, goToday }: Props) {
  return (
    <View style={styles.weekNavBar}>
      <TouchableOpacity testID="teacher-schedule-prev-week" style={styles.navArrow} onPress={() => { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d); }}>
        <Feather name="chevron-left" size={18} color={colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity testID="teacher-schedule-today-button" style={styles.todayBtn} onPress={goToday}>
        <Text style={styles.todayBtnText}>Today</Text>
      </TouchableOpacity>
      <Text testID="teacher-schedule-week-label" style={styles.weekLabel}>
        {week[0].day} {week[0].date} — {week[6].day} {week[6].date}
      </Text>
      <TouchableOpacity testID="teacher-schedule-next-week" style={styles.navArrow} onPress={() => { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d); }}>
        <Feather name="chevron-right" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}
