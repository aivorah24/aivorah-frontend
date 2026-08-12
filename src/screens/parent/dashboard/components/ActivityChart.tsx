import React from 'react';
import { View, Text } from 'react-native';
import type { AppColors } from '../../../../theme';
import { WEEK_DAYS } from '../constants';
import { formatStudyTime } from '../utils/dashboardHelpers';
import StackedBar from './common/StackedBar';

export default function ActivityChart({
  weeklyActivity, activityMax, colors, s,
}: {
  weeklyActivity: number[]; activityMax: number; colors: AppColors; s: any;
}) {
  return (
    <View style={s.chartCard}>
      <View style={s.goalLineRow}>
        <View style={s.goalLineDash} />
        <View style={s.goalBadge}><Text style={s.goalBadgeText}>2h</Text></View>
      </View>

      <View style={s.barsRow}>
        {WEEK_DAYS.map((day, i) => {
          const mins = weeklyActivity[i];
          const isGoalMet = mins >= 120;
          return (
            <View key={day} style={s.barColumn}>
              <Text style={s.barTimeLabel}>{mins > 0 ? formatStudyTime(mins) : ''}</Text>
              <StackedBar minutes={mins} maxMinutes={activityMax} isGoalMet={isGoalMet} colors={colors} />
              <Text style={s.barDayLabel}>{day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
