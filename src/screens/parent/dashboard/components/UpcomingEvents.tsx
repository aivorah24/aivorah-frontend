import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { Assignment } from '../types';
import { formatEventDate } from '../utils/dashboardHelpers';

export default function UpcomingEvents({
  events, onViewCalendar, colors, s,
}: {
  events: Assignment[]; onViewCalendar: () => void; colors: AppColors; s: any;
}) {
  if (events.length === 0) return null;

  return (
    <View style={s.eventsCard}>
      <Text style={s.eventsLabel}>Upcoming{'\n'}Events</Text>
      <View style={s.eventsList}>
        {events.map(ev => (
          <View key={ev.id} style={s.eventItem}>
            <View style={s.eventIconWrap}>
              <Feather name="calendar" size={16} color={colors.accentYellow} />
            </View>
            <View>
              <Text style={s.eventDate}>{formatEventDate(ev.dueDate)}</Text>
              <Text style={s.eventTitle}>{ev.title}</Text>
              <Text style={s.eventTime}>{ev.subject}</Text>
            </View>
          </View>
        ))}
      </View>
      <TouchableOpacity style={s.eventsViewAll} onPress={onViewCalendar} activeOpacity={0.8}>
        <Text style={s.cardFooterText}>View Calendar</Text>
        <Feather name="arrow-right" size={13} color={colors.accentYellow} />
      </TouchableOpacity>
    </View>
  );
}
