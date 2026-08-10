import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { ScheduleEvent, DragPreview } from '../types';
import { TIMES, TIME_LABEL_WIDTH, HOUR_HEIGHT } from '../constants';
import { typeColors, calcEventTop, calcEventHeight, toTitleCase, fmtHour12 } from '../utils/dateHelpers';

interface Props {
  loading: boolean;
  week: { iso: string; day: string; date: number }[];
  todayISO: string;
  eventDates: Set<string>;
  eventsMap: Record<string, ScheduleEvent[]>;
  hideCompleted: boolean;
  filterType: string;
  passesTagFilter: (ev: ScheduleEvent) => boolean;
  allDayHeight: number;
  gridHeight: number;
  colWidth: number;
  hScrollRef: React.RefObject<ScrollView>;
  didInitialScrollRef: React.MutableRefObject<boolean>;
  scrollToToday: (colWidth: number) => void;
  dragPreview: DragPreview | null;
  onColMouseDown: (e: any, dayIso: string) => void;
  onAllDaySlotPress: (dayIso: string) => void;
  onEventPress: (event: ScheduleEvent, colors: [string, string, string]) => void;
  onRemoveEvent: (id: string, dayIso: string) => void;
  onAddEventPress: () => void;
  styles: any;
  colors: AppColors;
}

export default function CalendarGrid({
  loading, week, todayISO, eventDates, eventsMap, hideCompleted, filterType, passesTagFilter,
  allDayHeight, gridHeight, colWidth, hScrollRef, didInitialScrollRef, scrollToToday,
  dragPreview, onColMouseDown, onAllDaySlotPress, onEventPress, onRemoveEvent, onAddEventPress,
  styles, colors,
}: Props) {
  return (
    <View style={styles.calendarContainer}>
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator size="small" color={colors.accentYellow} />
          <Text style={styles.emptyText}>Loading schedule…</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', height: 60 + allDayHeight + gridHeight }}>
          {/* FIXED LEFT: time labels (never scroll horizontally) */}
          <View style={{ width: TIME_LABEL_WIDTH, backgroundColor: colors.bgDark, zIndex: 2 }}>
            <View style={[styles.timeColHeader, { justifyContent: 'flex-end', paddingBottom: 6, alignItems: 'center' }]}>
              <Text style={{ fontSize: 8.5, fontWeight: '700', color: colors.textDim, textAlign: 'center', lineHeight: 11 }}>GMT{'\n'}+05:30</Text>
            </View>
            {/* "All-day" gutter label — keeps the time axis aligned with the
                all-day lane on the right, and labels the lane. */}
            <View style={[styles.allDayGutter, { height: allDayHeight }]}>
              <Text style={styles.allDayGutterText}>All{'\n'}day</Text>
            </View>
            {TIMES.map((t) => (
              <View key={t} style={{ height: HOUR_HEIGHT, justifyContent: 'flex-start', paddingTop: 4 }}>
                <Text style={styles.timeLabel}>{fmtHour12(t)}</Text>
              </View>
            ))}
          </View>

          {/* SCROLLABLE RIGHT: day headers + columns */}
          <ScrollView
            ref={hScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
            // Scroll to today once the grid content has actually laid out — the
            // effect alone can fire before the (loading-gated) ScrollView mounts.
            onContentSizeChange={() => {
              if (!didInitialScrollRef.current && week.some(d => d.iso === todayISO)) {
                didInitialScrollRef.current = true;
                scrollToToday(colWidth);
              }
            }}
          >
            <View style={{ width: colWidth * 7 }}>
              {/* Day header row */}
              <View style={styles.dayHeaderRow}>
                {week.map((d) => {
                  const isToday = d.iso === todayISO;
                  const hasDot = eventDates.has(d.iso);
                  return (
                    <View key={d.iso} style={[styles.dayHeader, { width: colWidth }]}>
                      <Text style={[styles.dayHeaderLabel, isToday && styles.dayHeaderLabelToday]}>{d.day}</Text>
                      <View style={[styles.dayHeaderCircle, isToday && styles.dayHeaderCircleToday]}>
                        <Text style={[styles.dayHeaderDate, isToday && styles.dayHeaderDateToday]}>{d.date}</Text>
                      </View>
                      {hasDot && <View style={[styles.dayDot, isToday && { backgroundColor: colors.accentYellow }]} />}
                    </View>
                  );
                })}
              </View>

              {/* All-day row — deadline/challenge items (or multi-day assignment ribbons) */}
              <View style={[styles.allDayRow, { height: allDayHeight }]}>
                {week.map((d) => {
                  const allDayEvents = (eventsMap[d.iso] ?? []).filter(e => {
                    if (hideCompleted && e.isCompleted) return false;
                    if (filterType === 'study' || filterType === 'classes') return false;
                    if (!passesTagFilter(e)) return false;
                    const tagLower = (e.tag || '').toLowerCase();
                    const isEventTag = ['holiday', 'vacation', 'assembly', 'timeline', 'whole school', 'rotation', 'cycle'].some(k => tagLower.includes(k));
                    return e.startTime === '23:59' || e.isAllDay || e.type === 'deadline' || e.type === 'challenge' || isEventTag;
                  });
                  return (
                    <TouchableOpacity
                      key={d.iso}
                      style={[styles.allDayCol, { width: colWidth, height: allDayHeight }]}
                      onPress={() => onAllDaySlotPress(d.iso)}
                      activeOpacity={0.8}
                    >
                      {allDayEvents.map(e => {
                        const [accent, fill, textCol] = typeColors(e.type);
                        const isCompleted = !!e.isCompleted;
                        const chipBg = isCompleted ? '#E6F4EA' : fill;
                        const chipBorder = isCompleted ? '#137333' : accent;
                        const chipTextCol = isCompleted ? '#137333' : textCol;
                        const isMultiDay = e.startDate && e.startDate !== e.date;
                        return (
                          <TouchableOpacity
                            key={e.id}
                            style={[styles.allDayChip, { backgroundColor: chipBg, borderLeftColor: chipBorder }]}
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
                            <Text
                              style={[
                                styles.allDayChipText,
                                { color: chipTextCol, textDecorationLine: isCompleted ? 'line-through' : 'none' }
                              ]}
                              numberOfLines={1}
                            >
                              {isMultiDay ? `Due ${e.date.slice(5)} · ` : ''}{e.title}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Day columns */}
              <View style={{ flexDirection: 'row' }}>
                {week.map((d) => {
                  // Timed events only. The weekly recurring bell schedule lives on
                  // the dedicated Timetable screen — it is intentionally NOT overlaid
                  // onto this calendar (which shows dated assignments/challenges/tasks
                  // and one-off events).
                  const dayEvents = (eventsMap[d.iso] ?? []).filter(e => {
                    if (e.startTime === '23:59' || e.type === 'deadline' || e.type === 'challenge') return false;
                    if (hideCompleted && e.isCompleted) return false;
                    if (filterType === 'assignments') return false;
                    if (!passesTagFilter(e)) return false;
                    return true;
                  });

                  return (
                    <View
                      key={d.iso}
                      style={[styles.dayCol, { width: colWidth, height: gridHeight }]}
                      // @ts-ignore — onMouseDown is valid in React Native Web
                      onMouseDown={(e: any) => onColMouseDown(e, d.iso)}
                      testID={`schedule-day-col-${d.iso}`}
                    >
                      {TIMES.map((t, idx) => (
                        <View
                          key={t}
                          style={[styles.hourCell, { top: idx * HOUR_HEIGHT }]}
                          testID={`schedule-slot-${d.iso}-${t}`}
                        />
                      ))}

                      {dragPreview?.dayIso === d.iso && dragPreview.height > 8 && (
                        <View style={{
                          position: 'absolute', left: 2, right: 2,
                          top: dragPreview.top, height: Math.max(dragPreview.height, 20),
                          backgroundColor: colors.accentYellow + '28',
                          borderLeftWidth: 3, borderLeftColor: colors.accentYellow,
                          borderRadius: 4, paddingHorizontal: 5, paddingVertical: 3,
                          zIndex: 10,
                          // @ts-ignore
                          pointerEvents: 'none',
                        }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentYellow }}>
                            {dragPreview.startT} – {dragPreview.endT}
                          </Text>
                        </View>
                      )}

                      {dayEvents.map(event => {
                        const top = calcEventTop(event.startTime);
                        const height = calcEventHeight(event.startTime, event.endTime);
                        const [accent, fill, textCol] = typeColors(event.type);
                        return (
                          <TouchableOpacity
                            key={event.id}
                            style={[styles.eventBlock, { top, height, backgroundColor: fill, borderLeftColor: accent, borderLeftWidth: 4 }]}
                            activeOpacity={0.82}
                            onPress={() => onEventPress(event, [accent, fill, textCol])}
                            // @ts-ignore — stop the day column's drag-to-create mousedown handler
                            // from also firing (it bubbles from this chip otherwise), which was
                            // opening the Add Event modal underneath this event's detail modal.
                            onMouseDown={(e: any) => e.stopPropagation?.()}
                          >
                            <Text style={[styles.eventTitle, { color: textCol }]}>{toTitleCase(event.title)}</Text>
                            <Text style={[styles.eventTime, { color: accent }]}>{event.startTime}{event.endTime ? `–${event.endTime}` : ''}</Text>
                            {!event.isTimetableClass && (
                              <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => onRemoveEvent(event.id, d.iso)}
                                // @ts-ignore
                                onMouseDown={(e: any) => e.stopPropagation?.()}
                                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                              >
                                <Feather name="x" size={10} color={accent} />
                              </TouchableOpacity>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Add event button */}
      <TouchableOpacity
        style={styles.addEventBtn}
        onPress={onAddEventPress}
        activeOpacity={0.8}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Add Event"
        testID="schedule-add-event-button"
      >
        <Feather name="plus" size={16} color={colors.accentYellow} />
        <Text style={styles.addEventText}>Add Event</Text>
      </TouchableOpacity>
    </View>
  );
}
