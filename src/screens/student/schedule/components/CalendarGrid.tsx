import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { ScheduleEvent, DragPreview } from '../types';
import WeekGrid, { makeGridStyles } from '../../../../components/schedule/WeekGrid';
import { typeColors, calcEventTop, calcEventHeight, toTitleCase } from '../utils/dateHelpers';

interface Props {
  loading: boolean;
  week: { iso: string; day: string; date: number }[];
  todayISO: string;
  eventsMap: Record<string, ScheduleEvent[]>;
  hideCompleted: boolean;
  filterType: string;
  passesTagFilter: (ev: ScheduleEvent) => boolean;
  allDayHeight: number;
  gridHeight: number;
  colWidth: number;
  hScrollRef: React.RefObject<ScrollView | null>;
  didInitialScrollRef: React.MutableRefObject<boolean>;
  scrollToToday: (colWidth: number) => void;
  dragPreview: DragPreview | null;
  onColMouseDown: (e: any, dayIso: string) => void;
  onAllDaySlotPress: (dayIso: string) => void;
  onEventPress: (event: ScheduleEvent, colors: [string, string, string]) => void;
  onRemoveEvent: (id: string, dayIso: string) => void;
  styles: any;
  colors: AppColors;
}

const ALL_DAY_TAGS = ['holiday', 'vacation', 'assembly', 'timeline', 'whole school', 'rotation', 'cycle'];

export default function CalendarGrid({
  loading, week, todayISO, eventsMap, hideCompleted, filterType, passesTagFilter,
  allDayHeight, gridHeight, colWidth, hScrollRef, didInitialScrollRef, scrollToToday,
  dragPreview, onColMouseDown, onAllDaySlotPress, onEventPress, onRemoveEvent,
  styles, colors,
}: Props) {
  const g = useMemo(() => makeGridStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={styles.calendarContainer}>
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator size="small" color={colors.accentYellow} />
          <Text style={styles.emptyText}>Loading schedule…</Text>
        </View>
      </View>
    );
  }

  return (
    <WeekGrid<ScheduleEvent>
      colors={colors}
      testIdPrefix="schedule"
      week={week}
      todayISO={todayISO}
      allDayHeight={allDayHeight}
      colWidth={colWidth}
      gridHeight={gridHeight}
      hScrollRef={hScrollRef}
      accent={colors.accentYellow}
      dragPreview={dragPreview}
      onColMouseDown={onColMouseDown}
      onAllDayPress={onAllDaySlotPress}
      // Scroll to today once the grid content has actually laid out — the
      // effect alone can fire before the (loading-gated) ScrollView mounts.
      onGridContentSizeChange={() => {
        if (!didInitialScrollRef.current && week.some(d => d.iso === todayISO)) {
          didInitialScrollRef.current = true;
          scrollToToday(colWidth);
        }
      }}
      // Deadline/challenge items (or multi-day assignment ribbons) go in the all-day lane.
      allDayEvents={(iso) => (eventsMap[iso] ?? []).filter(e => {
        if (hideCompleted && e.isCompleted) return false;
        if (filterType === 'study' || filterType === 'classes') return false;
        if (!passesTagFilter(e)) return false;
        const tagLower = (e.tag || '').toLowerCase();
        const isEventTag = ALL_DAY_TAGS.some(k => tagLower.includes(k));
        return e.startTime === '23:59' || e.isAllDay || e.type === 'deadline' || e.type === 'challenge' || isEventTag;
      })}
      // The weekly bell schedule lives on the Timetable screen, not here.
      timedEvents={(iso) => (eventsMap[iso] ?? []).filter(e => {
        if (e.startTime === '23:59' || e.type === 'deadline' || e.type === 'challenge') return false;
        if (hideCompleted && e.isCompleted) return false;
        if (filterType === 'assignments') return false;
        return passesTagFilter(e);
      })}
      renderAllDayChip={(e) => {
        const [accent, fill, textCol] = typeColors(e.type);
        const isCompleted = !!e.isCompleted;
        const chipTextCol = isCompleted ? '#137333' : textCol;
        const isMultiDay = e.startDate && e.startDate !== e.date;
        return (
          <TouchableOpacity
            style={[g.allDayChip, { backgroundColor: isCompleted ? '#E6F4EA' : fill, borderLeftColor: isCompleted ? '#137333' : accent }]}
            onPress={(evt) => {
              evt.stopPropagation();
              onEventPress(e, [accent, fill, textCol]);
            }}
            activeOpacity={0.75}
          >
            <Feather
              name={isCompleted ? 'check' : e.type === 'challenge' ? 'award' : 'flag'}
              size={11}
              color={chipTextCol}
              style={{ marginRight: 5, flexShrink: 0 }}
            />
            <Text style={[g.allDayChipText, { color: chipTextCol, textDecorationLine: isCompleted ? 'line-through' : 'none' }]} numberOfLines={1}>
              {isMultiDay ? `Due ${e.date.slice(5)} · ` : ''}{e.title}
            </Text>
          </TouchableOpacity>
        );
      }}
      renderTimedEvent={(event, iso) => {
        const [accent, fill, textCol] = typeColors(event.type);
        return (
          <TouchableOpacity
            style={[g.eventBlock, { top: calcEventTop(event.startTime), height: calcEventHeight(event.startTime, event.endTime), backgroundColor: fill, borderLeftColor: accent, borderLeftWidth: 4, zIndex: 2 }]}
            activeOpacity={0.82}
            onPress={() => onEventPress(event, [accent, fill, textCol])}
            // @ts-ignore — stop the day column's drag-to-create mousedown from also firing
            onMouseDown={(e: any) => e.stopPropagation?.()}
          >
            <Text style={[g.eventTitle, { color: textCol }]}>{toTitleCase(event.title)}</Text>
            <Text style={[g.eventTime, { color: accent }]}>{event.startTime}{event.endTime ? `–${event.endTime}` : ''}</Text>
            {!event.isTimetableClass && (
              <TouchableOpacity
                style={g.deleteBtn}
                onPress={() => onRemoveEvent(event.id, iso)}
                // @ts-ignore
                onMouseDown={(e: any) => e.stopPropagation?.()}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                testID={`schedule-delete-event-${event.id}`}
              >
                <Feather name="x" size={10} color={accent} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}
