import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { ScheduleEvent } from '../types';
import { typeColors } from '../utils/dateHelpers';

interface Props {
  deadlines: ScheduleEvent[];
  styles: any;
  colors: AppColors;
}

export default function UpcomingDeadlines({ deadlines, styles }: Props) {
  return (
    <View style={styles.sideCard} testID="schedule-upcoming-deadlines">
      <Text style={[styles.sideTitle, { marginBottom: 16 }]}>Upcoming Deadlines</Text>
      {deadlines.length === 0 ? (
        <Text style={styles.emptyText}>No upcoming deadlines 🎉</Text>
      ) : deadlines.slice(0, 6).map(dl => {
        const [accent, fill] = typeColors(dl.type);
        return (
          <View key={dl.id} style={styles.deadlineItem} testID={`schedule-deadline-${dl.id}`}>
            <View style={[styles.deadlineIcon, { backgroundColor: fill }]}>
              <Feather name={dl.type === 'challenge' ? 'award' : 'flag'} size={14} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deadlineTitle} numberOfLines={1}>{dl.title}</Text>
              <Text style={[styles.deadlineDue, { color: accent }]}>Due {dl.date}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
