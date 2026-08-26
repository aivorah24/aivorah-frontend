import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { TIMES, HOUR_HEIGHT, TIME_LABEL_WIDTH, TIMELINE_START_HOUR } from '../constants';
import { calcEventTop, calcEventHeight, tagColors, fmtHour12 } from '../utils/scheduleUtils';
import type { ScheduleEvent, StudentItem, WeekDay, DragPreview } from '../types';

interface Props {
  colors: AppColors;
  gold: string;
  styles: any;
  week: WeekDay[];
  todayISO: string;
  eventsMap: Record<string, ScheduleEvent[]>;
  passesTagFilter: (ev: ScheduleEvent) => boolean;
  allDayHeight: number;
  colWidth: number;
  gridHeight: number;
  hScrollRef: React.RefObject<ScrollView | null>;
  onGridContentSizeChange: () => void;
  nowTime: Date;
  students: StudentItem[];
  dragPreviewTeacher: DragPreview | null;
  makeOnMouseDown: (dayIso: string, gridHeight: number) => (e: any) => void;
  startDrag: (el: HTMLElement, clientY: number) => void;
  wasDragRef: React.MutableRefObject<boolean>;
  removeEvent: (id: string, dateStr: string) => void;
  openModal: (presetDate?: string, presetTime?: string, presetAllDay?: boolean, presetTag?: string) => void;
  setSelectedEvent: (e: any) => void;
}

export default function CalendarGrid({
  colors, gold, styles, week, todayISO, eventsMap, passesTagFilter,
  allDayHeight, colWidth, gridHeight, hScrollRef, onGridContentSizeChange, nowTime,
  students, dragPreviewTeacher, makeOnMouseDown, startDrag, wasDragRef,
  removeEvent, openModal, setSelectedEvent,
}: Props) {
  return (
    <>
      {/* ── Left: Week Calendar Grid ── */}
      <View style={styles.calendarContainer}>
        <View style={{ flexDirection: 'row', height: 62 + allDayHeight + gridHeight }}>
          {/* FIXED LEFT: time label column (never scrolls horizontally) */}
          <View style={{ width: TIME_LABEL_WIDTH, backgroundColor: colors.bgDark, zIndex: 2, overflow: 'hidden', borderRightWidth: 1, borderRightColor: colors.borderColor }}>
            {/* Spacer matching day header height with GMT label — Toddle-style: single line, left-aligned */}
            <View style={[styles.timeColHeader, { justifyContent: 'flex-end', paddingBottom: 6, paddingLeft: 6, alignItems: 'flex-start' }]}>
              <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textDim }} numberOfLines={1}>GMT+05:30</Text>
            </View>
            {/* All-day gutter label matching Toddle */}
            <View style={[styles.allDayGutter, { height: allDayHeight }]}>
              <Text style={styles.allDayGutterText}>All day</Text>
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
            onContentSizeChange={onGridContentSizeChange}
          >
            <View style={{ width: colWidth * 7 }}>
              {/* Day header row */}
              <View style={styles.dayHeaderRow}>
                {week.map((d) => {
                  const isToday = d.iso === todayISO;
                  return (
                    <View key={d.iso} style={[styles.dayHeader, { width: colWidth }, isToday && styles.dayHeaderToday]}>
                      <Text style={[styles.dayHeaderLabel, isToday && styles.dayHeaderLabelToday]}>{String(d.date).padStart(2, '0')} {d.day.charAt(0) + d.day.slice(1).toLowerCase()}</Text>
                    </View>
                  );
                })}
              </View>

              {/* All-day row — deadline/challenge items (stored at 23:59) are excluded
                  from the hourly grid below since a 1-minute-tall block there would be
                  invisible; show them here instead. Not draggable/deletable since these
                  are auto-generated from assignments/challenges, but tappable to view detail. */}
              {/* All-day row — Toddle style holiday / vacation / timeline / challenge chips */}
              <View style={[styles.allDayRow, { height: allDayHeight }]}>
                {week.map((d) => {
                  const allDayEvents = (eventsMap[d.iso] ?? []).filter(e => {
                    if (!passesTagFilter(e)) return false;
                    const tagLower = (e.tag || '').toLowerCase();
                    const isEventTag = ['holiday', 'vacation', 'assembly', 'timeline', 'whole school', 'rotation', 'cycle'].some(k => tagLower.includes(k));
                    return e.startTime === '23:59' || e.isAllDay || e.type === 'deadline' || e.type === 'challenge' || isEventTag;
                  });
                  return (
                    <TouchableOpacity
                      key={d.iso}
                      testID={`teacher-schedule-allday-col-${d.iso}`}
                      style={[styles.allDayCol, { width: colWidth, height: allDayHeight }]}
                      onPress={() => openModal(d.iso, undefined, true, 'Holidays and vacations')}
                      activeOpacity={0.8}
                    >
                      {allDayEvents.map(e => {
                        const [accent, fill, textCol] = tagColors(e.tag, e.type);
                        return (
                          <TouchableOpacity
                            key={e.id}
                            style={[styles.allDayChip, { backgroundColor: fill, borderLeftColor: accent }]}
                            onPress={(evt) => {
                              evt.stopPropagation();
                              setSelectedEvent({ ...e, accent, fill, textCol });
                            }}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.allDayChipText, { color: textCol }]} numberOfLines={1}>{e.title}</Text>
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
                  const dayEvents = (eventsMap[d.iso] ?? []).filter(
                    e => e.startTime !== '23:59' && passesTagFilter(e)
                  );
                  return (
                    <View
                      key={d.iso}
                      testID={`teacher-schedule-day-col-${d.iso}`}
                      style={[styles.dayCol, { width: colWidth, height: gridHeight }]}
                      // @ts-ignore
                      onMouseDown={makeOnMouseDown(d.iso, gridHeight)}
                    >
                      {/* Hour grid lines */}
                      {TIMES.map((t, idx) => (
                        <TouchableOpacity
                          key={t}
                          testID={`teacher-schedule-slot-${d.iso}-${t}`}
                          style={[styles.hourCell, { top: idx * HOUR_HEIGHT }]}
                          onPress={() => openModal(d.iso, t)}
                          activeOpacity={0.3}
                        />
                      ))}
                      {/* Current-time red indicator line (today's column only) */}
                      {d.iso === todayISO && (() => {
                        const nowH = nowTime.getHours();
                        const nowM = nowTime.getMinutes();
                        if (nowH < TIMELINE_START_HOUR || nowH > 22) return null;
                        const topPx = (nowH - TIMELINE_START_HOUR) * HOUR_HEIGHT + (nowM / 60) * HOUR_HEIGHT;
                        return (
                          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: topPx, zIndex: 10 }}>
                            <View style={{ position: 'absolute', left: -6, top: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E53935' }} />
                            <View style={{ height: 2, backgroundColor: '#E53935', opacity: 0.85 }} />
                          </View>
                        );
                      })()}
                      {/* Drag-to-create preview */}
                      {dragPreviewTeacher?.dayIso === d.iso && dragPreviewTeacher.height > 8 && (
                        <View style={{
                          position: 'absolute', left: 2, right: 2,
                          top: dragPreviewTeacher.top, height: Math.max(dragPreviewTeacher.height, 20),
                          backgroundColor: gold + '28',
                          borderLeftWidth: 3, borderLeftColor: gold,
                          borderRadius: 4, paddingHorizontal: 5, paddingVertical: 3,
                          zIndex: 10, // @ts-ignore
                          pointerEvents: 'none',
                        }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: gold }}>
                            {dragPreviewTeacher.startT} – {dragPreviewTeacher.endT}
                          </Text>
                        </View>
                      )}
                      {/* Absolutely positioned events — raw div for reliable drag */}
                      {dayEvents.map(event => {
                        const origTop = calcEventTop(event.startTime);
                        const height  = calcEventHeight(event.startTime, event.endTime);
                        const [accent, fill, textCol] = tagColors(event.tag, event.type);
                        const [sh, sm] = event.startTime.split(':').map(Number);
                        const [eh, em] = (event.endTime || event.startTime).split(':').map(Number);
                        const durationMins = Math.max(30, (eh * 60 + em) - (sh * 60 + sm));
                        const studentLabel = event.studentId === 'all'
                          ? 'All students'
                          : ((event as any).studentName ?? students.find(s => s.id === event.studentId)?.name ?? 'Student');
                        return (
                          <div
                            key={event.id}
                            data-testid={`teacher-schedule-event-${event.id}`}
                            data-eid={event.id}
                            data-edate={d.iso}
                            data-etop={String(origTop)}
                            data-edur={String(durationMins)}
                            onMouseDown={(e) => {
                              // Skip if clicking delete button
                              if ((e.target as HTMLElement).closest('[data-delbtn]')) return;
                              e.preventDefault();
                              startDrag(e.currentTarget, e.clientY);
                            }}
                            onClick={(e) => {
                              // A drag (mousemove past the 4px threshold) sets wasDragRef —
                              // only open the detail popup for a genuine click, not a drop.
                              if (wasDragRef.current) return;
                              if ((e.target as HTMLElement).closest('[data-delbtn]')) return;
                              setSelectedEvent({ ...event, date: d.iso, accent, fill, textCol });
                            }}
                            style={{
                              position: 'absolute', left: 2, right: 2,
                              top: origTop, height,
                              backgroundColor: fill,
                              borderLeft: `4px solid ${accent}`,
                              borderRadius: 4,
                              paddingLeft: 6, paddingRight: 5, paddingTop: 3, paddingBottom: 3,
                              overflow: 'hidden',
                              cursor: 'grab',
                              userSelect: 'none',
                              zIndex: 2,
                              fontFamily: fonts.sans,
                            }}
                          >
                            <div style={{ fontFamily: fonts.sans, fontSize: 11, fontWeight: 700, color: textCol, lineHeight: '13px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{event.title}</div>
                            <div style={{ fontFamily: fonts.sans, fontSize: 10, color: accent, lineHeight: '13px' }}>{event.startTime}{event.endTime ? `–${event.endTime}` : ''}</div>
                            <div style={{ fontFamily: fonts.sans, fontSize: 10, fontWeight: 600, color: textCol, opacity: 0.8, marginTop: 1, lineHeight: '13px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{studentLabel}</div>
                            <div
                              data-delbtn="1"
                              data-testid={`teacher-schedule-event-delete-${event.id}`}
                              onClick={() => removeEvent(event.id, d.iso)}
                              style={{ position: 'absolute', top: 3, right: 3, cursor: 'pointer', padding: 2 }}
                            >
                              <Feather name="x" size={10} color={accent} />
                            </div>
                          </div>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </>
  );
}
